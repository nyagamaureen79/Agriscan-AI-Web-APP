import smtplib
from email.mime.text import MIMEText
import os

def send_email(to_email: str, subject: str, html_content: str):
    sender_email = os.environ.get("SENDER_EMAIL")
    sender_password = os.environ.get("SENDER_PASSWORD")

    msg = MIMEText(html_content, "html")
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to_email

    # Gmail secure SMTP server
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender_email, sender_password)
        server.send_message(msg)
