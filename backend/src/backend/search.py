# search through the data given a specific query
import google.generativeai as genai
import os

genai.configure(api_key=os.environ["GEMINI_KEY"])

model = genai.GenerativeModel("gemini-1.5-flash")

# collect user response and search through query
query = input("Enter a query: ")
results = model.search(query)