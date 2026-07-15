'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  '¿Qué opción me conviene?',
  '¿Cuánto perderé si me jubilo antes?',
  '¿Debo seguir trabajando?',
  '¿Qué pasa con mi laguna de cotización?',
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Cerrar chat' : 'Abrir asistente IA'}
        aria-expanded={open}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg z-50 hover:scale-105 transition-transform"
      >
        {open ? (
          <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {/* Ventana */}
      <aside
        className={cn(
          'fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-140px)] bg-background border rounded-2xl shadow-xl z-50 flex flex-col transition-all',
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none translate-y-4'
        )}
        aria-hidden={!open}
      >
        {/* Header */}
        <header className="p-4 border-b flex items-center justify-between">
          <div>
            <div className="font-semibold">Asistente IA</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-success" />
              En línea
            </div>
          </div>
        </header>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              ¡Hola! Soy tu asistente de jubilación. ¿En qué te ayudo?
            </div>
          )}
          {messages.map(m => (
            <div
              key={m.id}
              className={cn(
                'max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed',
                m.role === 'user'
                  ? 'ml-auto bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted rounded-bl-sm'
              )}
            >
              {m.content}
            </div>
          ))}
          {isLoading && (
            <div className="bg-muted p-3 rounded-2xl rounded-bl-sm max-w-[85%] text-sm">
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Sugerencias */}
        {messages.length === 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => {
                  handleInputChange({ target: { value: s } } as any);
                  setTimeout(() => handleSubmit(), 0);
                }}
                className="text-xs px-3 py-1.5 rounded-full bg-muted border hover:bg-background transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Pregúntame lo que quieras..."
            className="flex-1 h-10 px-4 rounded-full border bg-background text-sm focus-ring"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" className="w-10 h-10 rounded-full" disabled={isLoading || !input.trim()}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </Button>
        </form>
      </aside>
    </>
  );
}