const orders = require('../data/orders.json');

function trackOrder(orderId) {
  const order = orders[String(orderId)];
  if (order) {
    return order;
  }
  return { error: "I couldn't find that order — please double check the ID." };
}

const trackOrderDeclaration = {
  name: "trackOrder",
  description: "Track an order using its order ID. Call this only when the user gives or clearly references an order ID.",
  parameters: {
    type: "object",
    properties: {
      orderId: {
        type: "string",
        description: "The order ID provided by the user."
      }
    },
    required: ["orderId"]
  }
};

module.exports = { trackOrder, trackOrderDeclaration };
