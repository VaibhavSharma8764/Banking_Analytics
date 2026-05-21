import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")
print(f"API Key found: {api_key is not None}")
if api_key:
    print(f"API Key starts with: {api_key[:10]}...")

client = Groq(api_key=api_key)

try:
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "test"}]
    )
    print("Success with llama-3.3-70b-versatile")
    print(completion.choices[0].message.content)
except Exception as e:
    print(f"Error with llama-3.3-70b-versatile: {e}")

try:
    completion = client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[{"role": "user", "content": "test"}]
    )
    print("Success with llama3-8b-8192")
except Exception as e:
    print(f"Error with llama3-8b-8192: {e}")
