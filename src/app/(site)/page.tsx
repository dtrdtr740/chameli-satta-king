import { HomePage, homeMetadata } from '@/components/site/HomePage';

export const generateMetadata = () => homeMetadata('home', '/');

export default function Page() {
  return <HomePage pageKey="home" path="/" />;
}
