import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="section center" style={{ padding: '40px 8px' }}>
      <h1 className="page-title">Page not found</h1>
      <p>
        <Link href="/" className="btn-dark">
          Go to Home
        </Link>
      </p>
    </div>
  );
}
