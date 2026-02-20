# AI Chat & Image Analysis Implementation

## ✅ What Has Been Implemented

I've successfully integrated both the **text chat** and **image analysis** features into the chat sidebar. Here's what was done:

### 1. **Text Chat with ChatGPT**
- Users can send text messages and get responses from ChatGPT (gpt-4o-mini)
- Real-time conversation with loading states
- Error handling with user-friendly messages
- Auto-scrolling to latest messages
- Available to **all authenticated users**

### 2. **Image Analysis with ChatGPT Vision**
- Upload images for AI analysis
- Preview selected images before sending
- Optional custom prompts for specific analysis
- Comprehensive validation (file type, size)
- Available to **admin users only**

### 3. **UI Features**
- Image upload button with icon (📷)
- Image preview with ability to remove
- Loading indicators ("Thinking...")
- Error messages displayed in chat
- Admin badge in header
- Helpful info text about availability
- Disabled states when appropriate
- Auto-scroll to newest messages

---

## 🔐 Authentication & Permissions

### Text Chat (All Users)
- Any authenticated user can use text chat
- No special role required
- Endpoint: `POST /ai/chat`

### Image Analysis (Admin Only)
- Requires admin role in Supabase user metadata
- Upload button only shown to admins
- Backend enforces admin check (returns 403 if not admin)
- Endpoint: `POST /ai/scan-data`

### How Admin Role is Checked
The component checks for admin role in two places:
```typescript
const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin';
```

**To set a user as admin in Supabase:**
1. Go to Authentication → Users in Supabase dashboard
2. Click on the user
3. Click "Edit user"
4. Under "User Metadata", add:
   ```json
   { "role": "admin" }
   ```
   OR under "App Metadata":
   ```json
   { "role": "admin" }
   ```

---

## 📝 How It Works - Step by Step

### **Text Chat Flow**

1. **User types message** → Enters text in input field
2. **User clicks Send** → Message is added to chat as "user" message
3. **Frontend calls API** → `POST /ai/chat` with `{ message: "user text" }`
4. **Shows loading** → "Thinking..." indicator appears
5. **Backend processes** → ChatGPT generates response
6. **Response received** → Bot message added to chat with ChatGPT's reply
7. **Auto-scroll** → Chat scrolls to show new message

**Code Logic:**
```typescript
// Add user message to chat
const userMessage = { sender: "user", message: text, timestamp: now };
setMessages([...messages, userMessage]);

// Call API
const response = await authFetch(`${API_BASE_URL}/ai/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: text }),
});

// Parse response
const data = await response.json();

// Add bot response to chat
const botMessage = { sender: "bot", message: data.reply, timestamp: now };
setMessages([...messages, botMessage]);
```

### **Image Analysis Flow**

1. **Admin clicks image icon** → File picker opens (JPEG/PNG/GIF/WebP only)
2. **User selects image** → Preview is shown with filename
3. **Optional: Add prompt** → User can type analysis instructions
4. **User clicks Send** → Image validation happens:
   - ✅ Check file type (image/jpeg, image/png, image/gif, image/webp)
   - ✅ Check file size (max 10 MB)
   - ✅ Check admin role
5. **User message added** → Shows image preview + prompt text
6. **Frontend creates FormData** → Appends image file + optional prompt
7. **API call** → `POST /ai/scan-data` with multipart/form-data
8. **Shows loading** → "Thinking..." indicator
9. **Backend processes** → ChatGPT Vision analyzes image
10. **Response received** → Bot message with analysis
11. **Image cleared** → Preview removed for next upload

**Code Logic:**
```typescript
// Create FormData
const formData = new FormData();
formData.append("image", selectedImage);
if (promptText?.trim()) {
  formData.append("prompt", promptText.trim());
}

// Call API (no Content-Type header - browser sets it with boundary)
const response = await authFetch(`${API_BASE_URL}/ai/scan-data`, {
  method: "POST",
  body: formData,
});

// Parse response
const data = await response.json();
// data.analysis contains the AI's description
```

---

## 🎨 UI Components & States

### **Message Types**
1. **Text message** - Normal chat message
2. **Image message** - Message with image preview
3. **Error message** - Red-styled message with AlertCircle icon
4. **Bot message** - AI response (gray background)
5. **User message** - User's input (primary color background)

### **States Managed**
```typescript
messages          // Array of all chat messages
inputValue        // Current text input
loading           // API call in progress
selectedImage     // File object for selected image
imagePreview      // Data URL for preview
isAdmin           // Whether user has admin role
```

### **Visual Elements**
- **Admin Badge** - Shows "Admin" tag in header if user is admin
- **Image Icon** - Button to upload images (admin only)
- **Image Preview** - Shows selected image with X button to remove
- **Loading Indicator** - "Thinking..." with spinning loader
- **Error Display** - Red message box with error icon
- **Timestamp** - Every message shows time sent
- **Auto-scroll** - Always shows latest message

---

## 🚨 Error Handling

### **Text Chat Errors**

| Error | Cause | User Message |
|-------|-------|--------------|
| 401 Unauthorized | Not logged in or token expired | "Invalid authentication credentials" |
| 502 Bad Gateway | OpenAI API failure | "Vision API error: ..." |
| 503 Service Unavailable | OpenAI API key not configured | "Chat is temporarily unavailable" |
| Network error | No internet or backend down | "Failed to send message" |

**Display:**
- Toast notification for quick feedback
- Error message in chat for context

### **Image Upload Errors**

| Error | Cause | User Message |
|-------|-------|--------------|
| Wrong file type | User selected non-image file | "Please select an image (JPEG, PNG, GIF, or WebP)" |
| File too large | Image > 10 MB | "Image too large: X.X MB. Max size: 10 MB." |
| 403 Forbidden | Non-admin tried to upload | "Admin role required for image analysis" |
| 400 Bad Request | Backend validation failed | Shows backend's detail message |
| 502 Bad Gateway | Vision API failure | "Vision API error: ..." |
| 503 Service Unavailable | OpenAI key not configured | "Image analysis is temporarily unavailable" |

**Validation happens in two places:**
1. **Frontend** - File type and size checked before API call
2. **Backend** - Additional validation + admin role check

---

## 🧪 Testing Guide

### **Test Text Chat**

1. Open the app and log in
2. Click the "Chat" button in the header
3. Chat sidebar opens on the right
4. Type a message: "What is 2 + 2?"
5. Click Send or press Enter
6. ✅ User message appears
7. ✅ "Thinking..." indicator shows
8. ✅ Bot response appears after ~1-2 seconds
9. Try edge cases:
   - Empty message → Send button disabled
   - Very long message → Should work (16,000 char limit)
   - Network error → Error message in chat

### **Test Image Upload (Admin Only)**

**As Non-Admin:**
1. Log in as regular user
2. Open chat sidebar
3. ✅ No image upload button visible
4. ✅ Info text says "Image upload requires admin role"

**As Admin:**
1. Set your user as admin in Supabase (see "How Admin Role is Checked")
2. Log out and log back in
3. Open chat sidebar
4. ✅ "Admin" badge visible in header
5. ✅ Image icon button (📷) visible
6. Click the image button
7. File picker opens
8. Select an image (JPEG/PNG/GIF/WebP)
9. ✅ Image preview appears with filename
10. Optionally type: "Extract all numbers"
11. Click Send
12. ✅ User message shows with image preview
13. ✅ "Thinking..." indicator shows
14. ✅ Bot response with analysis appears
15. Try error cases:
    - Select a text file → "Please select an image" error
    - Select a huge image (>10MB) → "Image too large" error
    - Upload image, then click X → Preview removed

### **Test Chat Persistence**

1. Send several messages
2. Close chat sidebar
3. Open chat sidebar again
4. ❌ Messages should be cleared (by design - each session is fresh)
5. To persist messages, you'd need to save them to localStorage or backend

---

## 🔧 Configuration Required

### **Backend Setup**

Your backend needs to have:

1. **OpenAI API Key** configured in environment variables
2. **Admin role check** implemented for `/ai/scan-data`
3. **Supabase JWT verification** for authentication

If these aren't set up, you'll see:
- 503 errors → OpenAI key missing
- 403 errors → Admin check failing
- 401 errors → JWT verification failing

### **Frontend Environment**

Make sure `.env` has:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

---

## 📁 Files Modified

- `/src/components/chat-sidebar.tsx` - Complete rewrite with both features
- `/src/lib/api.ts` - Already has `authFetch` helper
- `/src/contexts/auth-context.tsx` - Already provides `user` object

---

## 🎯 Features Implemented

✅ **Text Chat**
- Send text messages to ChatGPT
- Receive AI responses
- Loading states
- Error handling
- Auto-scroll

✅ **Image Upload**
- File picker with icon
- Image preview
- Custom prompts
- File validation (type & size)
- Admin-only access
- Clear selection

✅ **UI/UX**
- Admin badge
- Loading indicators
- Error messages in chat
- Toast notifications
- Disabled states
- Responsive layout
- Dark mode support

✅ **Security**
- Admin role checking
- Authentication required
- JWT tokens in requests
- File type validation
- File size limits

---

## 💡 Usage Examples

### **Basic Text Chat**
```
User: "What's the weather like?"
Bot: "I don't have access to real-time weather data..."

User: "Help me write a maintenance report"
Bot: "I'd be happy to help! What details would you like to include?"
```

### **Image Analysis (Admin)**
```
User: [Uploads property damage photo]
      "What issues do you see?"
Bot: "I can see water damage on the ceiling with visible staining..."

User: [Uploads invoice image]
      "Extract all amounts"
Bot: "Subtotal: $245.00, Tax: $19.60, Total: $264.60"
```

---

## 🐛 Troubleshooting

### "Image upload button not showing"
**Cause:** User is not marked as admin
**Fix:** Add admin role to user metadata in Supabase

### "Admin role required" error
**Cause:** Frontend thinks user is admin but backend disagrees
**Fix:** Ensure backend checks the same metadata field (user_metadata.role or app_metadata.role)

### "Chat is temporarily unavailable"
**Cause:** Backend's OpenAI API key not configured
**Fix:** Set OPENAI_API_KEY in backend environment

### Messages not sending
**Cause:** Authentication token missing or expired
**Fix:** Check console for 401 errors, log out and log back in

### Image upload fails with "Invalid file type"
**Cause:** Non-image file selected
**Fix:** Only select JPEG, PNG, GIF, or WebP images

---

## 🚀 Next Steps / Enhancements

### Possible Improvements:
1. **Message History** - Save chat to localStorage or backend
2. **Typing Indicator** - Show when bot is "typing"
3. **Markdown Support** - Format bot responses with markdown
4. **Code Syntax Highlighting** - If bot returns code
5. **Message Actions** - Copy, delete, or regenerate responses
6. **Conversation Context** - Send previous messages for context
7. **File Upload History** - Show previously analyzed images
8. **Multi-image Upload** - Analyze multiple images at once
9. **Voice Input** - Speech-to-text for messages
10. **Export Chat** - Download conversation as PDF/text

Let me know if you'd like any of these features implemented! 🎉
