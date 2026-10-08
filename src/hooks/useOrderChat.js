import { useEffect, useRef, useState, useCallback } from 'react'
import { subscribeOrderMessages, sendOrderMessage, markOrderMessagesRead } from '../firebase/db.js'
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db as firestoreDb } from '../firebase/init.js'

function setChatActive(orderId, role, active) {
    if (!orderId || !role) return
    try {
        const orderRef = doc(firestoreDb, 'orders', orderId)
        if (active) {
            updateDoc(orderRef, { chatActiveBy: arrayUnion(role) }).catch(() => { })
        } else {
            updateDoc(orderRef, { chatActiveBy: arrayRemove(role) }).catch(() => { })
        }
    } catch (e) { /* ignore */ }
}

export function useOrderChat(orderId, isOpen, { userId, userRole }) {
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(false)
    const unsubRef = useRef(null)
    const bottomRef = useRef(null)

    useEffect(() => {
        if (!isOpen || !orderId) {
            setMessages([])
            setLoading(false)
            if (unsubRef.current) {
                unsubRef.current()
                unsubRef.current = null
            }
            return
        }

        setLoading(true)
        // Signal that this user has the chat open (suppress push notifications)
        setChatActive(orderId, userRole, true)

        unsubRef.current = subscribeOrderMessages(orderId, (items) => {
            setMessages(items)
            setLoading(false)
        })

        // Mark existing messages as read when opening
        markOrderMessagesRead(orderId, userRole).catch(() => { })

        return () => {
            // Signal that the user closed the chat
            setChatActive(orderId, userRole, false)
            if (unsubRef.current) {
                unsubRef.current()
                unsubRef.current = null
            }
        }
    }, [orderId, isOpen, userRole])

    // Mark as read when new messages arrive while chat is open
    const prevCountRef = useRef(0)
    useEffect(() => {
        if (!isOpen || !orderId) return
        if (messages.length > prevCountRef.current) {
            const hasUnreadFromOther = messages.some((m) => m.senderRole !== userRole && !m.read)
            if (hasUnreadFromOther) {
                markOrderMessagesRead(orderId, userRole).catch(() => { })
            }
        }
        prevCountRef.current = messages.length
    }, [messages.length, isOpen, orderId, userRole])

    const sendMessage = useCallback(async (text) => {
        if (!text.trim() || !orderId) return
        if (!userId) {
            console.warn('[useOrderChat] cannot send: no userId (not authenticated?)')
            return
        }
        // Optimistic: add immediately
        const optimistic = {
            id: `temp-${Date.now()}`,
            senderId: userId,
            senderRole: userRole,
            text: text.trim(),
            read: false,
            createdAt: Date.now(),
            _sending: true,
        }
        setMessages((prev) => [...prev, optimistic])
        try {
            await sendOrderMessage(orderId, { senderId: userId, senderRole: userRole, text: text.trim() })
        } catch (err) {
            console.error('[useOrderChat] send failed:', err)
        }
    }, [orderId, userId, userRole])

    const markRead = useCallback(() => {
        if (orderId) markOrderMessagesRead(orderId, userRole).catch(() => { })
    }, [orderId, userRole])

    return { messages, loading, sendMessage, markRead, bottomRef }
}
