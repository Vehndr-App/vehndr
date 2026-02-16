"use client";

import { useState, useRef, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { EVENT_BESTIE_OPEN } from "../constants/eventBestie";

const QUICK_PROMPTS = [
  { text: "Find me vendors 🔍", prompt: "Help me find vendors" },
  { text: "Event ideas 💡", prompt: "Give me some event ideas" },
  { text: "What's trending? 📈", prompt: "What events are trending right now?" },
  { text: "Budget tips 💰", prompt: "How can I plan an event on a budget?" },
];

const VIBE_QUIZ = [
  {
    question: "What's your ideal event vibe?",
    options: [
      { text: "🎉 High energy party", vibe: "party" },
      { text: "🧘 Chill and relaxing", vibe: "chill" },
      { text: "📚 Educational & informative", vibe: "educational" },
      { text: "🛍️ Shopping & markets", vibe: "market" },
    ]
  },
  {
    question: "Who are you planning for?",
    options: [
      { text: "Just me! 🙋", size: "solo" },
      { text: "Small group (2-10)", size: "small" },
      { text: "Medium gathering (10-50)", size: "medium" },
      { text: "Big celebration (50+)", size: "large" },
    ]
  },
  {
    question: "What's your budget vibe?",
    options: [
      { text: "💸 Balling on a budget", budget: "low" },
      { text: "💵 Mid-range is my range", budget: "medium" },
      { text: "💎 Treat yourself energy", budget: "high" },
      { text: "🤷 Flexible", budget: "any" },
    ]
  },
];

export default function EventBestie() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hey bestie! 💜 I'm your Event Bestie! I can help you find the perfect vendors, plan amazing events, or take a quick vibe quiz to get personalized recommendations. What can I help you with today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [isNativePlatform, setIsNativePlatform] = useState(null);

  // Hide bubble when running as native app (iOS/Android via Capacitor)
  useEffect(() => {
    setIsNativePlatform(Capacitor.isNativePlatform());
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Open from support page (or anywhere) via custom event
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener(EVENT_BESTIE_OPEN, handler);
    return () => window.removeEventListener(EVENT_BESTIE_OPEN, handler);
  }, []);

  const handleSend = async (messageText = input) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (in production, this would call an AI API)
    setTimeout(() => {
      const response = generateResponse(messageText);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      setIsLoading(false);
    }, 1000);
  };

  const generateResponse = (message) => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("vendor") || lowerMessage.includes("find")) {
      return "I'd love to help you find vendors! 🎯 Here are some tips:\n\n1. Use the search bar on the home page\n2. Filter by category (Food, Fashion, Wellness, etc.)\n3. Check out vendor ratings and reviews\n4. Save your favorites with the heart button!\n\nWant me to start a vibe quiz to match you with perfect vendors?";
    }

    if (lowerMessage.includes("event") && (lowerMessage.includes("idea") || lowerMessage.includes("plan"))) {
      return "Ooh, let's brainstorm! 💡✨\n\n**Popular event types:**\n🎪 Festival vibes - Music, art, and good times\n🛍️ Pop-up markets - Support local vendors\n🧘 Wellness retreats - Self-care is self-love\n🍕 Food festivals - Yummy adventures\n🎨 Art walks - Culture and creativity\n\nWant to take a quick quiz to find your perfect event style?";
    }

    if (lowerMessage.includes("trending") || lowerMessage.includes("popular")) {
      return "Here's what's hot right now! 🔥\n\n**Trending Events:**\n1. Immersive experiences\n2. Night markets\n3. Wellness festivals\n4. Food truck rallies\n5. Artisan pop-ups\n\n**Hot Vendor Categories:**\n• Plant-based food vendors 🌱\n• Sustainable fashion 👗\n• Local artisan crafts 🎨\n\nCheck out the Events page to see what's coming up near you!";
    }

    if (lowerMessage.includes("budget") || lowerMessage.includes("cheap") || lowerMessage.includes("save")) {
      return "Budget queen energy! 💰👑\n\n**Tips for planning on a budget:**\n\n1. **Filter by price** - Use the price filters to find affordable vendors\n2. **Book early** - Many vendors offer early-bird discounts\n3. **Package deals** - Look for vendors offering bundles\n4. **Off-peak events** - Weekday events often cost less\n5. **Local vendors** - Save on travel/shipping costs\n\nPro tip: Save vendors to your favorites and compare prices before booking!";
    }

    if (lowerMessage.includes("quiz")) {
      setShowQuiz(true);
      setQuizStep(0);
      setQuizAnswers({});
      return "Let's find your vibe! ✨ Answer a few quick questions and I'll give you personalized recommendations!";
    }

    // Default response
    return "That's a great question! 🤔 I can help you with:\n\n• 🔍 Finding vendors\n• 📅 Event planning tips\n• 💡 Event ideas\n• 📈 What's trending\n• 💰 Budget advice\n• 🎯 Personalized recommendations (try the vibe quiz!)\n\nWhat sounds most helpful to you?";
  };

  const handleQuizAnswer = (answer) => {
    const newAnswers = { ...quizAnswers, ...answer };
    setQuizAnswers(newAnswers);

    if (quizStep < VIBE_QUIZ.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      // Quiz complete - generate recommendations
      setShowQuiz(false);
      const recommendation = generateQuizRecommendation(newAnswers);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: recommendation },
      ]);
    }
  };

  const generateQuizRecommendation = (answers) => {
    let recs = "Based on your vibe, here's what I recommend! 🎯✨\n\n";

    if (answers.vibe === "party") {
      recs += "**Your vibe:** High energy party animal! 🎉\n";
      recs += "• Check out Music and Entertainment vendors\n";
      recs += "• Look for DJ/Music category\n";
      recs += "• Festival events are your jam!\n\n";
    } else if (answers.vibe === "chill") {
      recs += "**Your vibe:** Zen master! 🧘\n";
      recs += "• Browse Health & Wellness vendors\n";
      recs += "• Look for spa and relaxation services\n";
      recs += "• Wellness events will speak to your soul!\n\n";
    } else if (answers.vibe === "educational") {
      recs += "**Your vibe:** Knowledge seeker! 📚\n";
      recs += "• Explore Workshop vendors\n";
      recs += "• Look for classes and demos\n";
      recs += "• Expo events are perfect for you!\n\n";
    } else {
      recs += "**Your vibe:** Shopping enthusiast! 🛍️\n";
      recs += "• Browse all vendor categories\n";
      recs += "• Markets and pop-ups are your paradise!\n\n";
    }

    recs += `**Event size:** ${
      answers.size === "solo"
        ? "Solo adventures await!"
        : answers.size === "small"
        ? "Perfect for intimate gatherings"
        : answers.size === "medium"
        ? "Great for group outings"
        : "Time to party big!"
    }\n\n`;

    recs += "Ready to explore? Head to the Vendors page to start browsing, or check out upcoming Events! 💜";

    return recs;
  };

  // On native (iOS/Android) we hide the bubble but still show the panel when opened (e.g. from support page)
  if (isNativePlatform === null) return null;

  const showBubble = !isNativePlatform;

  return (
    <>
      {/* Floating Button - hidden on native so support-page trigger is the only entry */}
      {showBubble && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`fixed bottom-20 right-4 z-[60] w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
            isOpen
              ? "bg-[var(--gray-200)] rotate-0"
              : "bg-gradient-to-br from-[var(--violet-500)] to-[var(--magenta-500)] hover:scale-110 hover:shadow-2xl"
          }`}
          aria-label={isOpen ? "Close chat" : "Open Event Bestie"}
        >
          {isOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gray-600)" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <span className="text-2xl">✨</span>
          )}
        </button>
      )}

      {/* Pulse animation when closed - web only */}
      {showBubble && !isOpen && (
        <span className="fixed bottom-20 right-4 z-[59] w-14 h-14 rounded-full bg-[var(--violet-500)] animate-ping opacity-30 pointer-events-none" />
      )}

      {/* Chat Panel - always rendered so it can open from support page on native */}
      <div
        className={`fixed bottom-36 right-4 z-[60] w-[320px] max-w-[calc(100vw-2rem)] bg-white rounded-[var(--radius-2xl)] shadow-2xl overflow-hidden transition-all duration-300 ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-500)] px-3 py-2.5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">
                ✨
              </div>
              <div>
                <h3 className="font-semibold text-sm">Event Bestie</h3>
                <p className="text-[10px] text-white/70">Your event assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close chat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="h-[260px] overflow-y-auto p-3 space-y-3 bg-[var(--gray-50)]">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-500)] text-white rounded-br-md"
                    : "bg-white text-[var(--gray-700)] shadow-sm rounded-bl-md"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Quiz UI */}
          {showQuiz && (
            <div className="bg-white p-4 rounded-2xl shadow-sm space-y-3">
              <p className="font-medium text-[var(--gray-900)]">
                {VIBE_QUIZ[quizStep].question}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {VIBE_QUIZ[quizStep].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuizAnswer(option)}
                    className="p-3 text-sm text-left rounded-xl bg-[var(--gray-50)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-700)] transition-colors"
                  >
                    {option.text}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--gray-400)] text-center">
                Question {quizStep + 1} of {VIBE_QUIZ.length}
              </p>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-3 rounded-2xl shadow-sm rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[var(--violet-400)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-[var(--violet-400)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-[var(--violet-400)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="px-3 py-2 border-t border-[var(--gray-100)] bg-white">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt.prompt)}
                className="flex-shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-full bg-[var(--violet-50)] text-[var(--violet-700)] hover:bg-[var(--violet-100)] transition-colors"
              >
                {prompt.text}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-2.5 border-t border-[var(--gray-100)] bg-white">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask me anything..."
              className="flex-1 h-9 px-3 rounded-full bg-[var(--gray-100)] text-sm outline-none focus:ring-2 focus:ring-[var(--violet-500)]/20"
              style={{ fontSize: '16px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 rounded-full bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-500)] text-white flex items-center justify-center disabled:opacity-50 transition-opacity"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

