export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search + url.hash, "https://app.marginal-econ.workers.dev");
    return Response.redirect(targetUrl.toString(), 301);
  },
};
