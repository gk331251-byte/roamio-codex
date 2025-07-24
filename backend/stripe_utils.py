import os
import stripe
import asyncio

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

async def create_subscription_session(user_id: str, email: str, success: str, cancel: str):
    """Create a Stripe Checkout session for subscriptions."""
    return await asyncio.to_thread(
        stripe.checkout.Session.create,
        payment_method_types=["card"],
        mode="subscription",
        line_items=[{"price": os.getenv("STRIPE_PRICE_ID", "price_123"), "quantity": 1}],
        customer_email=email,
        client_reference_id=user_id,
        metadata={"uid": user_id},
        success_url=success,
        cancel_url=cancel,
    )


def verify_webhook(payload: bytes, sig: str):
    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not secret:
        raise ValueError("Missing webhook secret")
    return stripe.Webhook.construct_event(payload, sig, secret)
