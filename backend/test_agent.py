import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
print(f"API Key present: {bool(api_key)}")
if api_key:
    print(f"API Key first 4 chars: {api_key[:4]}")

try:
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
    print("Invoking LLM...")
    response = llm.invoke([HumanMessage(content="Hello, are you there?")])
    print("Response received:")
    print(response.content)
except Exception as e:
    print(f"Error invoking LLM: {e}")
