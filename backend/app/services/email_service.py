"""
Email service.

If EMAIL_HOST / EMAIL_USERNAME / EMAIL_PASSWORD are not configured, every
function here logs the event instead of sending a real email, and returns
False. This lets the rest of the app (registration, checkout, order status
updates) run in local development without crashing when SMTP isn't set up.
"""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("shopnexus.email")


def _send(to_email: str, subject: str, html_body: str) -> bool:
    if not settings.email_configured:
        logger.info("[EMAIL SKIPPED - not configured] to=%s subject=%s", to_email, subject)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            server.starttls()
            server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())
        logger.info("Email sent to=%s subject=%s", to_email, subject)
        return True
    except Exception:
        # Never let email failure break the calling request.
        logger.exception("Failed to send email to=%s subject=%s", to_email, subject)
        return False


def _template(title: str, body_html: str) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color:#4f46e5;">ShopNexus</h2>
      <h3>{title}</h3>
      {body_html}
      <hr/>
      <p style="color:#888; font-size:12px;">This is an automated message from ShopNexus. Please do not reply.</p>
    </div>
    """


def send_welcome_email(to_email: str, name: str) -> bool:
    body = f"<p>Hi {name},</p><p>Welcome to ShopNexus! Your account has been created successfully.</p>"
    return _send(to_email, "Welcome to ShopNexus", _template("Welcome!", body))


def send_order_confirmation_email(to_email: str, name: str, order_number: str, total: str) -> bool:
    body = f"<p>Hi {name},</p><p>Your order <b>{order_number}</b> has been placed. Total: <b>₹{total}</b>.</p>"
    return _send(to_email, f"Order Confirmed - {order_number}", _template("Order Confirmed", body))


def send_payment_confirmation_email(to_email: str, name: str, order_number: str, amount: str) -> bool:
    body = f"<p>Hi {name},</p><p>We received your payment of <b>₹{amount}</b> for order <b>{order_number}</b>.</p>"
    return _send(to_email, f"Payment Received - {order_number}", _template("Payment Confirmed", body))


def send_order_status_email(to_email: str, name: str, order_number: str, status_text: str) -> bool:
    body = f"<p>Hi {name},</p><p>Your order <b>{order_number}</b> status changed to <b>{status_text}</b>.</p>"
    return _send(to_email, f"Order Update - {order_number}", _template("Order Status Update", body))


def send_password_reset_email(to_email: str, name: str, reset_link: str) -> bool:
    body = f"<p>Hi {name},</p><p>Click the link below to reset your password:</p><p><a href='{reset_link}'>{reset_link}</a></p>"
    return _send(to_email, "Reset Your Password", _template("Password Reset", body))
