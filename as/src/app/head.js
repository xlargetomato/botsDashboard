export default function Head() {
  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content="WhatsApp Dashboard" />
      <meta httpEquiv="Content-Security-Policy" content="connect-src 'self' https://api.example.com; default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;" />
      <link rel="icon" href="/favicon.ico" />
    </>
  );
}
