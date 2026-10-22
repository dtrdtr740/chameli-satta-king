import { ContentPage, contentMetadata } from '@/components/site/ContentPage';

const def = { pageKey: 'contact-us', path: '/contact-us', title: 'Contact Us' };

export const generateMetadata = () => contentMetadata(def);

export default function Page() {
  return <ContentPage {...def} showContact />;
}
