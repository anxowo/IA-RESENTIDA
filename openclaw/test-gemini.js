const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyDSYkd1kiPQWJFv5Fi_nfTCA5tPmGelypk");

async function test() {
  console.log("🔄 Probando Gemini API...");

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Di solo: FUNCIONA");
    const response = await result.response;
    console.log("✅ ÉXITO:", response.text());
  } catch (error) {
    console.error("❌ Error:", error.message);

    if (error.message.includes("403")) {
      console.log("\n💡 Solución:");
      console.log("1. Ve a https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com");
      console.log("2. Asegúrate de que la API esté HABILITADA");
      console.log("3. Espera 2-3 minutos y prueba de nuevo");
    }
  }
}

test();
