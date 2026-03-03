import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import resend

router = APIRouter(prefix="/api/contact", tags=["contact"])

class ContactRequest(BaseModel):
    name: str
    email: str
    message: str

@router.post("")
async def submit_contact_form(contact: ContactRequest):
    resend_api_key = os.getenv("RESEND_API_KEY")
    resend_to_email = os.getenv("RESEND_TO_EMAIL")

    if not resend_api_key or not resend_to_email:
        # If the backend isn't configured for emails, just accept it gracefully
        # or return a 500 error. For now, let's log it and fail to let the developer know.
        print("[AI.pollo Error] Resend API keys missing in environment variables.")
        raise HTTPException(status_code=500, detail="Contact form is currently misconfigured on the server.")

    resend.api_key = resend_api_key

    # Validate inputs
    if not contact.name.strip() or not contact.email.strip() or not contact.message.strip():
        raise HTTPException(status_code=400, detail="All fields are required.")

    # Construct the email parameters
    # The default 'from' domain for Resend free tier is 'onboarding@resend.dev'
    # It can only send TO the verified email address (resend_to_email)
    params = {
        "from": "Acme <onboarding@resend.dev>",
        "to": resend_to_email,
        "subject": f"AI.pollo Contact: {contact.name}",
        "html": f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                body {{
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #020617; /* bg-slate-950 */
                    margin: 0;
                    padding: 40px 20px;
                    color: #f8fafc;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(2, 6, 23, 0.95) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 32px; /* rounded-[2rem] */
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }}
                .header {{
                    padding: 40px 48px;
                    text-align: center;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    background: radial-gradient(circle at top, rgba(0, 242, 254, 0.1) 0%, transparent 70%);
                }}
                .badge {{
                    display: inline-block;
                    padding: 4px 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(0, 242, 254, 0.2);
                    border-radius: 9999px;
                    color: #00f2fe; /* brand-cyan */
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    margin-bottom: 16px;
                }}
                .title {{
                    margin: 0;
                    font-size: 32px;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                    background: linear-gradient(to right, #ffffff, rgba(255, 255, 255, 0.6));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }}
                .content {{
                    padding: 48px;
                }}
                .sender-info {{
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 32px;
                }}
                .label {{
                    font-size: 12px;
                    font-weight: 500;
                    color: rgba(255, 255, 255, 0.4);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin: 0 0 8px 0;
                }}
                .value {{
                    font-size: 16px;
                    font-weight: 500;
                    color: rgba(255, 255, 255, 0.9);
                    margin: 0;
                }}
                .email-link {{
                    color: #00f2fe;
                    text-decoration: none;
                }}
                .glass-card {{
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 20px;
                    padding: 24px;
                    margin-top: 8px;
                }}
                .message-text {{
                    margin: 0;
                    font-size: 15px;
                    line-height: 1.7;
                    color: rgba(255, 255, 255, 0.7);
                    white-space: pre-wrap;
                }}
                .footer {{
                    padding: 32px 48px;
                    text-align: center;
                    background: rgba(0, 0, 0, 0.2);
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }}
                .button {{
                    display: inline-block;
                    background-color: #00f2fe;
                    color: #0f172a;
                    font-weight: 700;
                    text-decoration: none;
                    padding: 14px 32px;
                    border-radius: 12px;
                    font-size: 14px;
                    transition: all 0.2s;
                }}
                .watermark {{
                    margin-top: 24px;
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.2);
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="badge">New Incoming Intel</div>
                    <h1 class="title">AI.pollo Transmission</h1>
                </div>
                
                <div class="content">
                    <div class="sender-info">
                        <div>
                            <p class="label">Sender Name</p>
                            <p class="value">{contact.name}</p>
                        </div>
                    </div>
                    
                    <div class="sender-info">
                        <div>
                            <p class="label">Reply-To Address</p>
                            <p class="value"><a href="mailto:{contact.email}" class="email-link">{contact.email}</a></p>
                        </div>
                    </div>
                    
                    <div>
                        <p class="label">Message Payload</p>
                        <div class="glass-card">
                            <p class="message-text">{contact.message}</p>
                        </div>
                    </div>
                </div>
                
                <div class="footer">
                    <a href="mailto:{contact.email}" class="button">Reply to {contact.name.split(' ')[0]}</a>
                    <div class="watermark">Designed and engineered for a premium auditory experience.</div>
                </div>
            </div>
        </body>
        </html>
        """
    }

    try:
        # Send the email synchronously via the Resend SDK
        # Fast API handles synchronous block fine via threadpool, but resend SDK is quick
        email_response = resend.Emails.send(params)
        return {"success": True, "message": "Your message has been sent successfully."}
    except Exception as e:
        print(f"[AI.pollo Error] Failed to send email via Resend: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message. Please try again later.")
