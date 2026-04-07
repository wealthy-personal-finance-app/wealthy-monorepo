import {
  createCheckoutSession,
  verifyWebhook,
  fulfillOrder,
} from "../services/stripeService.js"
import {Subscription, successResponse, errorResponse} from "@wealthy/common"

export const checkout = async (req, res) => {
  try {
    const userId = req.user.id
    const {interval = "monthly"} = req.body

    const existingSub = await Subscription.findOne({
      userId,
      plan: "pro",
      status: "active",
      expiryDate: {$gt: new Date()}, 
    })

    if (existingSub) {
      return errorResponse(
        res,
        400,
        "You already have an active Pro subscription."
      )
    }

    const session = await createCheckoutSession(
      userId,
      req.user.email,
      interval
    )

    return successResponse(res, 201, "Stripe session created", {
      url: session.url,
    })
  } catch (error) {
    return errorResponse(res, 500, "Failed to initiate payment", error)
  }
}

export const webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"]
  try {
    const event = await verifyWebhook(req.body, sig)

    if (event.type === "checkout.session.completed") {
      await fulfillOrder(event.data.object)
    }

    res.json({received: true})
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`)
  }
}
