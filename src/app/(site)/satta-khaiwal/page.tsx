import { HomePage, homeMetadata } from '@/components/site/HomePage';

export const generateMetadata = () => homeMetadata('home_2', '/satta-khaiwal');

export default function Page() {
  return <HomePage pageKey="home_2" path="/satta-khaiwal" />;
}
