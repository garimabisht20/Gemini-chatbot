

import { useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previousInteractionId, setPreviousInteractionId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  async function sendMessage() {
    if ((!message.trim() && !selectedFile) || loading) return;

    const userMessage = message.trim();
    const fileToSend = selectedFile;

    // Display the user's message
    setMessages((prev) => [
      ...prev,
      {
        text: userMessage || `Please analyze this file: ${fileToSend.name}`,
        sender: "user"
      }
    ]);

    setMessage("");
    setLoading(true);

    try {
      // Create a FormData object
      const formData = new FormData();

      // Add the text message
      formData.append("message", userMessage);

      // Add previous conversation ID if available
      if (previousInteractionId) {
        formData.append("previousInteractionId", previousInteractionId);
      }

      // Add the selected file if available
      if (fileToSend) {
        formData.append("file", fileToSend);
      }

      // Send everything to the backend
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      // Save the latest Gemini interaction ID
      setPreviousInteractionId(data.interactionId);

      // Display Gemini's response
      setMessages((prev) => [
        ...prev,
        { text: data.reply, sender: "bot" }
      ]);

      // Clear the selected file after successful upload
      setSelectedFile(null);

    } catch (error) {
      console.error("Gemini API error:", error);

      setMessages((prev) => [
        ...prev,
        {
          text: error.message || "Gemini is temporarily unavailable. Please try again.",
          sender: "bot"
        }
      ]);

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>Gemini Chat</h2>

        <button
          className="new-chat"
          onClick={() => {
            setMessages([]);
            setPreviousInteractionId(null);
          }}
        >
          + New Chat
        </button>

        <p className="sidebar-text">
          Your conversations will appear here.
        </p>
      </aside>

      <main className="chat-area">
        <header className="chat-header">
          <h3>Gemini Assistant</h3>
        </header>

        {messages.length === 0 ? (
          <section className="welcome">
            <h1>Hello! 👋</h1>
            <h2>How can I help you today?</h2>
            <p>Ask me anything. I'm here to help.</p>
          </section>
        ) : (
          <section className="messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                {typeof msg.text === "string" ? (
                  msg.text
                ) : (
                  <div className="extracted-data">

                    <h3>{msg.text.Title}</h3>

                    <p>
                      <strong>Summary:</strong>
                      <br />
                      {msg.text.Summary}
                    </p>

                    <div>
                      <strong>Key items:</strong>

                      <ul>
                        {msg.text["Key items"].map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="message bot typing">
                Gemini is typing...
              </div>
            )}
          </section>
        )}
        {selectedFile && (
          <div className="selected-file">
            <span>{selectedFile.name}</span>

            <button
              onClick={() => setSelectedFile(null)}
              type="button"
            >
              ✕
            </button>
          </div>
        )}
        <div className="input-container">

          {/* File attachment button */}
          <label className="attach-button">
            +
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              hidden
              onChange={(e) => {
                setSelectedFile(e.target.files[0] || null);
              }}
            />
          </label>

          <input
            type="text"
            placeholder="Message Gemini..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />

          <button onClick={sendMessage} disabled={(!message.trim() && !selectedFile) || loading}>
            ↑
          </button>

        </div>

        <p className="disclaimer">
          Gemini can make mistakes. Check important information.
        </p>
      </main>
    </div>
  );
}

export default App;
