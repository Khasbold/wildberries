import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useOrderChat } from '../hooks/useOrderChat.js'
import { Send, X, MessageCircle, Loader2 } from 'lucide-react'

function formatMsgTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function formatDayLabel(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const diff = (today - msgDay) / 86400000
    if (diff === 0) return 'Өнөөдөр'
    if (diff === 1) return 'Өчигдөр'
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function ChatBubbles({ messages, currentUserId, bottomRef }) {
    const containerRef = useRef(null)

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight
        }
    }, [messages.length])

    let lastDay = ''

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5" style={{ minHeight: 0 }}>
            {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                    <MessageCircle className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm">Мессеж байхгүй байна</p>
                    <p className="text-xs mt-1">Эхлээд бичнэ үү!</p>
                </div>
            ) : (
                messages.map((msg) => {
                    const isMine = msg.senderId === currentUserId
                    const dayLabel = formatDayLabel(msg.createdAt)
                    let showDaySep = false
                    if (dayLabel !== lastDay) {
                        showDaySep = true
                        lastDay = dayLabel
                    }
                    return (
                        <div key={msg.id}>
                            {showDaySep && (
                                <div className="flex justify-center my-2">
                                    <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-3 py-0.5">{dayLabel}</span>
                                </div>
                            )}
                            <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`relative max-w-[80%] px-3 py-2 rounded-2xl text-sm break-words ${isMine
                                    ? 'bg-[#D66B3E] text-white rounded-br-md'
                                    : 'bg-slate-100 text-slate-800 rounded-bl-md'
                                    } ${msg._sending ? 'opacity-70' : ''}`}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                    <p className={`text-[10px] mt-0.5 ${isMine ? 'text-white/70' : 'text-slate-400'} text-right`}>
                                        {formatMsgTime(msg.createdAt)}
                                        {msg._sending && ' ⏳'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                })
            )}
            <div ref={bottomRef} />
        </div>
    )
}

function ChatInput({ onSend }) {
    const [text, setText] = useState('')
    const inputRef = useRef(null)

    function handleSend() {
        if (!text.trim()) return
        onSend(text)
        setText('')
        inputRef.current?.focus()
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-2 flex items-end gap-2">
            <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Мессеж бичих..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-[#D66B3E]/50 max-h-24"
                style={{ minHeight: '38px' }}
            />
            <button
                type="button"
                onClick={handleSend}
                disabled={!text.trim()}
                className="shrink-0 w-9 h-9 rounded-full bg-[#D66B3E] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#c45d35] transition-colors"
            >
                <Send className="w-4 h-4" />
            </button>
        </div>
    )
}

/** Drawer mode — used on customer side (OrdersPage) */
export function OrderChatDrawer({ orderId, currentUserId, currentUserRole, storeName, onClose, isOpen, unreadCount }) {
    const { messages, loading, sendMessage, bottomRef } = useOrderChat(orderId, isOpen, {
        userId: currentUserId,
        userRole: currentUserRole,
    })

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[100000] flex flex-col justify-end sm:justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative w-full sm:max-w-lg sm:mx-auto bg-white rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl"
                style={{ maxHeight: 'min(85vh, 600px)', minHeight: '350px' }}>
                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-[#D66B3E]" />
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{storeName || 'Чат'}</p>
                            <p className="text-[10px] text-slate-400">Захиалгын чат</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Messages */}
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                    </div>
                ) : (
                    <ChatBubbles messages={messages} currentUserId={currentUserId} bottomRef={bottomRef} />
                )}

                {/* Input */}
                <ChatInput onSend={sendMessage} />
            </div>
        </div>,
        document.body
    )
}

/** Inline card mode — used on admin side (OrderDetailsAdminPage) */
export function OrderChatCard({ orderId, currentUserId, currentUserRole, unreadCount }) {
    const [expanded, setExpanded] = useState(true)
    const { messages, loading, sendMessage, bottomRef } = useOrderChat(orderId, expanded, {
        userId: currentUserId,
        userRole: currentUserRole,
    })

    return (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
                type="button"
                onClick={() => setExpanded((p) => !p)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#D66B3E]" />
                    <span className="text-sm font-semibold text-slate-900">Захиалгын чат</span>
                    {unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <span className="text-xs text-slate-400">{expanded ? '▲' : '▼'}</span>
            </button>

            {expanded && (
                <div className="flex flex-col border-t border-slate-100" style={{ height: '380px' }}>
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                        </div>
                    ) : (
                        <ChatBubbles messages={messages} currentUserId={currentUserId} bottomRef={bottomRef} />
                    )}
                    <ChatInput onSend={sendMessage} />
                </div>
            )}
        </div>
    )
}
