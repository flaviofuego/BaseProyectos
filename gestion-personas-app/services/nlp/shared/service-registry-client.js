const axios = require("axios");

function createServiceRegistryClient(serviceConfig) {
  const registryUrl =
    process.env.SERVICE_REGISTRY_URL || "http://service-registry:3010";
  const serviceId = `${serviceConfig.name}-${
    serviceConfig.host || "nlp-service"
  }-${serviceConfig.port}-${Date.now()}`;

  const registrationData = {
    serviceId,
    name: serviceConfig.name,
    host: serviceConfig.host || "nlp-service",
    port: serviceConfig.port,
    protocol: "http",
    metadata: serviceConfig.metadata || {},
  };

  axios
    .post(`${registryUrl}/register`, registrationData)
    .then(() => {
      console.log(`✅ Service registered in registry: ${serviceConfig.name}`);
    })
    .catch((err) => {
      console.error("Failed to register nlp service:", err.message);
    });

  const interval = setInterval(() => {
    axios
      .post(`${registryUrl}/heartbeat/${serviceId}`)
      .then(() => console.log(`💓 Heartbeat sent for ${serviceConfig.name}`))
      .catch((err) => console.error(`💔 Heartbeat failed: ${err.message}`));
  }, 15000);

  const shutdown = async (signal) => {
    console.log(`🛑 ${signal} received. Deregistering nlp service...`);
    clearInterval(interval);
    try {
      await axios.delete(`${registryUrl}/deregister/${serviceId}`);
    } catch (e) {}
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  return { serviceId };
}

module.exports = { createServiceRegistryClient };
