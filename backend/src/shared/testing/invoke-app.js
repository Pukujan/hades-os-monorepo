import { Readable } from "node:stream";

export function createJsonRequest({ method, path, body, headers = {} }) {
  const payload = body == null ? null : Buffer.from(JSON.stringify(body));
  let pushed = false;

  const req = new Readable({
    read() {
      if (pushed) {
        this.push(null);
        return;
      }
      pushed = true;
      if (payload) {
        this.push(payload);
      }
      this.push(null);
    }
  });

  req.method = method;
  req.url = path;
  req.headers = {
    host: "127.0.0.1",
    ...(payload ? { "content-type": "application/json", "content-length": String(payload.length) } : {}),
    ...headers
  };

  return req;
}

export function createJsonResponse() {
  const chunks = [];
  const headers = {};
  let resolve;

  const res = {
    statusCode: 200,
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    getHeader(name) {
      return headers[name.toLowerCase()];
    },
    removeHeader(name) {
      delete headers[name.toLowerCase()];
    },
    writeHead(statusCode, nextHeaders = {}) {
      res.statusCode = statusCode;
      for (const [name, value] of Object.entries(nextHeaders)) {
        res.setHeader(name, value);
      }
      return res;
    },
    status(statusCode) {
      res.statusCode = statusCode;
      return res;
    },
    json(value) {
      if (!res.getHeader("content-type")) {
        res.setHeader("content-type", "application/json; charset=utf-8");
      }
      res.end(JSON.stringify(value));
      return res;
    },
    send(value) {
      if (typeof value === "object" && !Buffer.isBuffer(value)) {
        return res.json(value);
      }
      res.end(value);
      return res;
    },
    end(value) {
      if (value != null) {
        chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(String(value)));
      }
      const body = Buffer.concat(chunks).toString("utf8");
      resolve({
        status: res.statusCode,
        headers: { ...headers },
        body
      });
      return res;
    }
  };

  const promise = new Promise((done) => {
    resolve = done;
  });

  return { res, promise };
}

export async function invokeApp(app, { method, path, body, headers = {} }) {
  const req = createJsonRequest({ method, path, body, headers });
  const { res, promise } = createJsonResponse();
  app.handle(req, res);
  return promise;
}

