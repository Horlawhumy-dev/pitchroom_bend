# Realtime Interview Help

This project sets up an Express server using WebSocket to communicate with OpenAI's Realtime API, generating STAR format responses for interview questions.

## Prerequisites

- **Node.js** (v16+ recommended)
- **npm**
- **TypeScript** (installed via `npm install`)
- An **OpenAI API key**

## Getting Started

### 1. Clone the Repository

```bash
    git clone git@github.com:lightforth-org/ms-interview-help.git
    cd ms-interview-help
```

### 2. Install Dependencies

```bash
    npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root of the project and add your OpenAI API key:

```bash
    touch .env
```

Add the following line:

```
OPENAI_API_KEY=
OPENAI_API_URL=wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01
ENV=dev
PORT=
```

### 4. Running the Application

You can run the server directly with `ts-node`:

```bash
    npm run dev
```

### 5. Accessing the WebSocket

Once the server is running, you have:

```bash
    localhost:3000/api/v1/upload - POST method to upload resume and jd with keys (resume, jobDescription)
    ws://localhost:3000?sessionId=<session_id_from_resume_upload>
```

### 6. Run Tests

```bash
    npx jest
```

The server will respond with the generated STAR format response.

### 7. Stopping the Server

Press `Ctrl+C` in your terminal to stop the server.

### Swagger Docs

```bash
    localhost:3000/docs
```

### Check formatting issues and fix if any:

```bash
    npx prettier . --check
    npx prettier . --write
```

---

## Troubleshooting

- **WebSocket Not Connecting**: Ensure your OpenAI API key is correct.
- **Connection Errors**: Check local network/firewall settings.
- <https://platform.openai.com/docs/guides/realtime>

---
# pitchroom_bend
