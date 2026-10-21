import io
import re
from datetime import datetime
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    KeepTogether,
    Table,
    TableStyle,
    HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Page X of Y' in the footer.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running Header (on pages after page 1)
        if self._pageNumber > 1:
            self.drawString(36, 11 * inch - 30, "Kuizila Quiz Assessment")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 11 * inch - 34, 8.5 * inch - 36, 11 * inch - 34)

        # Running Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 36, 26, page_str)
        self.drawString(36, 26, "Generated with Kuizila AI Quiz Engine")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(36, 36, 8.5 * inch - 36, 36)

        self.restoreState()


def sanitize_filename(title: str, is_answer_key: bool = False) -> str:
    """Creates a clean, safe filename for downloaded PDFs."""
    clean = re.sub(r'[^a-zA-Z0-9_\- ]', '', title or 'quiz').strip().lower()
    clean = re.sub(r'\s+', '_', clean)[:40]
    suffix = "answer_key" if is_answer_key else "quiz"
    return f"kuizila_{clean}_{suffix}.pdf"


def validate_quiz_for_pdf_export(quiz) -> List[str]:
    """Validates that the quiz has a title and complete questions before export."""
    errors = []
    if not quiz.title or not quiz.title.strip():
        errors.append("Quiz title is required.")

    questions = [qq.question for qq in getattr(quiz, "quiz_questions", []) if qq.question]
    if not questions:
        errors.append("Quiz contains no questions. Please add questions before exporting.")

    for idx, q in enumerate(questions, 1):
        if not q.question_text or not q.question_text.strip():
            errors.append(f"Question {idx} is missing question text.")
        raw_opts = q.options or []
        if len(raw_opts) < 2:
            errors.append(f"Question {idx} has fewer than 2 answer choices.")

    return errors


def generate_quiz_pdf(quiz, include_answers: bool = False) -> bytes:
    """
    Generates a high-quality, printable PDF of the quiz using ReportLab.
    If include_answers is False, outputs a student/participant quiz without revealing answers.
    If include_answers is True, outputs an official trainer Answer Key with correct answers and explanations.
    """
    validation_errors = validate_quiz_for_pdf_export(quiz)
    if validation_errors:
        raise ValueError(" ".join(validation_errors))

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=42,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    brand_style = ParagraphStyle(
        'LoomiBrand',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=12,
        textColor=colors.HexColor("#0D9488"),  # Loomi Teal
        textTransform='uppercase',
        spaceAfter=4
    )

    title_style = ParagraphStyle(
        'LoomiTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0F172A"),
        alignment=0,
        spaceAfter=6
    )

    subtitle_badge_style = ParagraphStyle(
        'LoomiSubtitleBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#0369A1") if not include_answers else colors.HexColor("#047857"),
        spaceAfter=10
    )

    meta_text_style = ParagraphStyle(
        'LoomiMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569")
    )

    instruction_style = ParagraphStyle(
        'LoomiInstruction',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceAfter=12
    )

    q_title_style = ParagraphStyle(
        'QuestionTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=6
    )

    option_style = ParagraphStyle(
        'OptionText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#1E293B")
    )

    correct_option_style = ParagraphStyle(
        'CorrectOptionText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#065F46")  # Dark emerald
    )

    explanation_style = ParagraphStyle(
        'ExplanationText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#0F766E")
    )

    story = []

    # Brand Label
    story.append(Paragraph("KUIZILA ASSESSMENT PLATFORM", brand_style))

    # Main Quiz Title
    story.append(Paragraph(quiz.title, title_style))

    # Mode Indicator
    if include_answers:
        story.append(Paragraph("OFFICIAL ANSWER KEY & EXPLANATIONS", subtitle_badge_style))
    else:
        story.append(Paragraph("PARTICIPANT ASSESSMENT", subtitle_badge_style))

    # Meta Table: Category, Question count, Date, Student Name Line
    qq_list = getattr(quiz, "quiz_questions", []) or []
    question_count = len(qq_list)
    time_limit = (quiz.settings or {}).get("time_limit", 30)

    if not include_answers:
        meta_data = [
            [
                Paragraph(f"<b>Category:</b> {quiz.category or 'General'}", meta_text_style),
                Paragraph(f"<b>Questions:</b> {question_count}", meta_text_style),
                Paragraph("<b>Name:</b> ___________________________", meta_text_style),
            ],
            [
                Paragraph(f"<b>Time per Q:</b> {time_limit} seconds", meta_text_style),
                Paragraph(f"<b>Date:</b> {datetime.utcnow().strftime('%B %d, %Y')}", meta_text_style),
                Paragraph("<b>Score:</b> ______ / ______", meta_text_style),
            ]
        ]
    else:
        meta_data = [
            [
                Paragraph(f"<b>Category:</b> {quiz.category or 'General'}", meta_text_style),
                Paragraph(f"<b>Total Questions:</b> {question_count}", meta_text_style),
                Paragraph(f"<b>Standard Time Limit:</b> {time_limit}s", meta_text_style),
            ]
        ]

    meta_table = Table(meta_data, colWidths=[2.2 * inch, 2.2 * inch, 2.8 * inch])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)

    # Divider
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=10))

    # Instructions
    instructions_text = quiz.instructions or "Choose the best answer for each question. Work steadily and answer all items."
    story.append(Paragraph(f"<b>Instructions:</b> {instructions_text}", instruction_style))

    # Questions Loop
    sorted_qq = sorted(qq_list, key=lambda x: x.question_order)

    for idx, qq in enumerate(sorted_qq, 1):
        q = qq.question
        if not q:
            continue

        q_elements = []

        # Question Header
        q_text = q.question_text.strip()
        q_elements.append(Paragraph(f"<b>{idx}.</b> {q_text}", q_title_style))

        # Parse Options
        raw_options = q.options or []
        normalized_options = []
        for opt_idx, opt in enumerate(raw_options):
            if isinstance(opt, dict):
                opt_text = opt.get("text", "")
                is_correct = bool(opt.get("is_correct", False))
            else:
                opt_text = str(opt)
                is_correct = (opt_text == q.correct_answer)
            normalized_options.append((opt_text, is_correct))

        # If correct answer is not explicitly marked in options, compare with q.correct_answer
        if include_answers and not any(is_c for _, is_c in normalized_options) and q.correct_answer:
            normalized_options = [
                (t, t.strip().lower() == q.correct_answer.strip().lower())
                for t, _ in normalized_options
            ]

        # Render each option
        opt_rows = []
        for opt_idx, (opt_text, is_correct) in enumerate(normalized_options):
            letter_label = chr(65 + opt_idx)  # A, B, C, D...
            if not include_answers:
                # Student version: [   ] A. Text
                row_p = Paragraph(f"<font color='#94A3B8'>[ &nbsp; ]</font> &nbsp; <b>{letter_label}.</b> &nbsp; {opt_text}", option_style)
            else:
                # Answer Key version
                if is_correct:
                    row_p = Paragraph(
                        f"<b>[ &#10004; ]</b> &nbsp; <b>{letter_label}.</b> &nbsp; <b>{opt_text}</b> &nbsp; <font color='#059669'><b>(CORRECT ANSWER)</b></font>",
                        correct_option_style
                    )
                else:
                    row_p = Paragraph(
                        f"<font color='#CBD5E1'>[ &nbsp; ]</font> &nbsp; <b>{letter_label}.</b> &nbsp; {opt_text}",
                        option_style
                    )
            opt_rows.append([row_p])

        opt_table = Table(opt_rows, colWidths=[7.2 * inch])
        opt_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        q_elements.append(opt_table)

        # In Answer Key: add explanation if available
        if include_answers and q.explanation and q.explanation.strip():
            expl_content = [
                [
                    Paragraph(f"<b>Rationale:</b> {q.explanation.strip()}", explanation_style)
                ]
            ]
            expl_table = Table(expl_content, colWidths=[7.2 * inch])
            expl_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F0FDFA")),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#99F6E4")),
                ('LEFTPADDING', (0, 0), (-1, -1), 12),
                ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            q_elements.append(Spacer(1, 4))
            q_elements.append(expl_table)

        q_elements.append(Spacer(1, 10))

        # KeepTogether prevents individual question and its options from splitting awkwardly across pages
        story.append(KeepTogether(q_elements))

    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()
