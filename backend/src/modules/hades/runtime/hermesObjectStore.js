import crypto from "node:crypto";

export function createHermesObjectStore({ mode = "memory", supabaseClient, bucket } = {}) {
  const objects = new Map();

  if (mode === "supabase") {
    async function getObject({ key }) {
      const { data, error } = await supabaseClient.storage.from(bucket).download(key);
      if (error) throw error;
      const body = await data.text();
      return { key, body };
    }

    async function putObject({ key, body, contentType }) {
      const { data, error } = await supabaseClient.storage.from(bucket).upload(key, body, {
        contentType: contentType || "application/octet-stream",
        upsert: true,
      });
      if (error) throw error;
      return { key, etag: data?.id || key.split("/").pop() };
    }

    async function deleteObject({ key }) {
      const { error } = await supabaseClient.storage.from(bucket).remove([key]);
      if (error) throw error;
    }

    async function createSignedUrl({ key, expiresInSeconds = 3600 }) {
      const { data, error } = await supabaseClient.storage.from(bucket).createSignedUrl(key, expiresInSeconds);
      if (error) throw error;
      return { url: data.signedUrl };
    }

    async function putJson({ key, value }) {
      const body = typeof value === "string" ? value : JSON.stringify(value);
      return putObject({ key, body, contentType: "application/json" });
    }

    async function getJson({ key }) {
      const result = await getObject({ key });
      if (!result) return null;
      return JSON.parse(result.body);
    }

    return { getObject, putObject, deleteObject, createSignedUrl, putJson, getJson };
  }

  async function getObject({ key }) {
    const body = objects.get(key);
    if (!body) return null;
    return { key, body };
  }

  async function putObject({ key, body, contentType }) {
    objects.set(key, body);
    return { key, etag: crypto.randomUUID() };
  }

  async function deleteObject({ key }) {
    objects.delete(key);
  }

  async function createSignedUrl({ key, expiresInSeconds }) {
    return { url: `memory://${key}` };
  }

  async function putJson({ key, value }) {
    const body = typeof value === "string" ? value : JSON.stringify(value);
    return putObject({ key, body, contentType: "application/json" });
  }

  async function getJson({ key }) {
    const result = await getObject({ key });
    if (!result) return null;
    const body = typeof result.body === "string" ? result.body : result.body.toString("utf8");
    return JSON.parse(body);
  }

  return { getObject, putObject, deleteObject, createSignedUrl, putJson, getJson };
}
