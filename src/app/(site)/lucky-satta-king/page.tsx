import { HomePage, homeMetadata } from '@/components/site/HomePage';

export const generateMetadata = () => homeMetadata('home_3', '/lucky-satta-king');

export default function Page() {
  return <HomePage pageKey="home_3" path="/lucky-satta-king" />;
}
