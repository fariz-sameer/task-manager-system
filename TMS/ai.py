from google import genai
from django.conf import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)


def summarize_activities(activity_text):

    prompt = f"""
    You are summarizing the history of a software development task.

    The activity log contains:
    - Task creation
    - Assignee updates
    - Technical progress reports
    - File uploads
    - Deadline changes
    - Status changes
    - Discussions
    - Completion events

    Instructions:

    1. Read every line.
    2. Treat free-text progress updates as the most important source of information.
    3. Summarize WHAT work was completed, not just status transitions.
    4. Mention major backend/frontend/features completed.
    5. Mention important uploads if they contributed to the task.
    6. Mention status changes only as milestones.
    7. Merge repetitive updates.
    8. Mention contributor names when useful.
    9. Produce 4-6 bullets in chronological order.
    10. Do not invent information.
    11: Make it neat and easily readable for the users.
    12: Don't add '**' in the beginning.

    Activity Log:

    {activity_text}
    """

    response = client.interactions.create(
        model="gemini-3.1-flash-lite",
        input=prompt,
    )

    return response.output_text


def executive_daily_digest(log_text):

    prompt = f"""
You are an executive project analyst.

You are given task activities grouped by company and task.

Generate an Executive Daily Digest using exactly this structure.

Operational Velocity

Bottlenecks

Tomorrow's Priorities

Rules
- Return plain text only.
- Do not use Markdown.
- Do not use #.
- Do not use **.
- Do not number anything.
- Generate between 3 and 4 bullet points for EACH section.
- Each bullet must describe ONE topic only.
- Each bullet should be between 15 and 30 words.
- After every bullet point, go to the next line.
- Do NOT write paragraphs.
- Do NOT combine multiple projects into the same bullet.
- Put ONE blank line after every bullet.
- Use only the bullet character "•".

Example

Operational Velocity

• Google completed server deployment.
• ARACO finished network infrastructure.
• JODAH completed approval workflow integration.


Bottlenecks

• Client approval is still pending.
• Infrastructure testing remains incomplete.


Tomorrow's Priorities

• Finalize deployment.
• Review pending approvals.

Task Activity Log

{log_text}

{log_text}
"""

    response = client.interactions.create(
        model="gemini-3.1-flash-lite",
        input=prompt,
    )

    return response.output_text
