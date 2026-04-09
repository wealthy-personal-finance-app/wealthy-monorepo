import { Conversation, Subscription, errorResponse } from "@wealthy/common";

export const checkChatLimit = async (req, res, next) => {
  const userId = req.user.id;

  const isPro = await Subscription.findOne({
    userId,
    status: "active",
    expiryDate: { $gt: new Date() }
  });

  if (isPro) return next();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const chatCount = await Conversation.aggregate([
    { $match: { userId: req.user._id } },
    { $unwind: "$messages" },
    { $match: { 
        "messages.role": "user", 
        "messages.timestamp": { $gte: today } 
    }},
    { $count: "total" }
  ]);

  const totalUsed = chatCount.length > 0 ? chatCount[0].total : 0;
  const LIMIT = 5;

  if (totalUsed >= LIMIT) {
    return errorResponse(res, 403, "Daily limit reached. Upgrade to Pro for unlimited chats.", {
      limitReached: true,
      currentUsage: totalUsed,
      maxLimit: LIMIT
    });
  }

  next();
};