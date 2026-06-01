'use client';

import React, { useState } from 'react';
import { Send, Bot, Sparkles, Loader2 } from 'lucide-react';

interface AIAssistantProps {
  jobId: string | null;
}

export default function AIAssistant({ jobId }: AIAssistantProps) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    {
      sender: 'bot',
      text: 'Xin chào! Tôi là trợ lý dữ liệu **Cuong Design**. Tôi có thể giúp bạn trả lời các câu hỏi về doanh thu, suất ăn, phòng bán, hoặc các cảnh báo chất lượng dữ liệu của file forecast đã import. Hãy hỏi tôi gì đó nhé!',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userText = query;
    setQuery('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userText, jobId }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: data.answer || 'Có lỗi xảy ra khi xử lý câu hỏi.' },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: `Không thể kết nối đến máy chủ: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    'Ngày 30/05 có bao nhiêu khách ăn trưa?',
    'Tháng 5 có bao nhiêu khách check-in?',
    'Booking nào thiếu link?',
    'Doanh thu tháng 5 là bao nhiêu?',
    'Sale nào có doanh thu cao nhất?',
    'Có booking nào bị trùng phòng không?'
  ];

  return (
    <div className="glass-card p-6 flex flex-col h-[400px] justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
          <Bot className="h-5 w-5" />
          <h3 className="font-outfit font-bold text-lg text-[var(--foreground)]">
            AI Trợ Lý Vận Hành
          </h3>
          <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
        </div>
        <p className="text-xs text-[var(--muted)] mb-4">Hỏi trực tiếp dữ liệu báo cáo vận hành resort</p>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto px-1 space-y-3 mb-4 text-sm scrollbar-thin">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col max-w-[85%] rounded-xl p-3 ${
              msg.sender === 'user'
                ? 'bg-emerald-600 text-white ml-auto rounded-tr-none'
                : 'bg-[var(--muted-bg)] text-[var(--foreground)] mr-auto rounded-tl-none border border-[var(--border)]'
            }`}
          >
            {/* Simple manual markdown parser helper */}
            <div 
              className="prose prose-sm dark:prose-invert break-words leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: msg.text
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/\n/g, '<br />') 
              }}
            />
          </div>
        ))}
        {loading && (
          <div className="bg-[var(--muted-bg)] text-[var(--muted)] mr-auto rounded-xl rounded-tl-none border border-[var(--border)] p-3 flex items-center gap-2 max-w-[80%]">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
            <span className="text-xs">Đang truy vấn database...</span>
          </div>
        )}
      </div>

      {/* Input or Sample Suggestions */}
      <div>
        {messages.length === 1 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {sampleQuestions.slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="text-[11px] bg-[var(--muted-bg)] hover:bg-[var(--border)] text-[var(--foreground)] px-2.5 py-1 rounded-full border border-[var(--border)] transition-all cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập câu hỏi (Ví dụ: Doanh thu tháng 5 là bao nhiêu?)"
            className="flex-1 bg-[var(--muted-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={loading}
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg p-2 flex items-center justify-center transition-all cursor-pointer"
            disabled={loading || !query.trim()}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
