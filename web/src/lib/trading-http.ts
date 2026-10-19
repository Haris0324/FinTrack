const MAX_TRADING_PROVIDER_RESPONSE_BYTES = 512 * 1024;

export async function readBoundedTradingResponse(response: Response): Promise<Response> {
  const contentLength = Number(response.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_TRADING_PROVIDER_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new Error("TRADING_PROVIDER_RESPONSE_TOO_LARGE");
  }
  if (!response.body) throw new Error("TRADING_PROVIDER_RESPONSE_INVALID");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_TRADING_PROVIDER_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("TRADING_PROVIDER_RESPONSE_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(bytes, { status: response.status, statusText: response.statusText, headers: response.headers });
}

export async function readBoundedTradingJson(response: Response): Promise<unknown> {
  const boundedResponse = await readBoundedTradingResponse(response);
  try {
    return await boundedResponse.json();
  } catch {
    throw new Error("TRADING_PROVIDER_RESPONSE_INVALID");
  }
}
