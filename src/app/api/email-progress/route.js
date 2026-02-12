import { NextResponse } from 'next/server';

let activeConnections = new Set();

export async function GET(request) {
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Store the controller to send updates
      activeConnections.add(controller);

      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected' })}\n\n`;
      controller.enqueue(encoder.encode(data));

      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        activeConnections.delete(controller);
        controller.close();
      });
    }
  });

  return new Response(stream, { headers });
}

// Function to broadcast progress updates to all connected clients
export function broadcastProgress(current, total) {
  const progressData = {
    current,
    total,
    percentage: Math.round((current / total) * 100)
  };

  const data = `data: ${JSON.stringify(progressData)}\n\n`;
  const encoder = new TextEncoder();

  activeConnections.forEach(controller => {
    try {
      controller.enqueue(encoder.encode(data));
    } catch (error) {
      // Remove dead connections
      activeConnections.delete(controller);
    }
  });
}

// Make the broadcast function available globally
global.emailProgressBroadcast = broadcastProgress;
