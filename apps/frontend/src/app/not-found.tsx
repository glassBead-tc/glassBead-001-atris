import Link from 'next/link';
import { Button } from '@audius/harmony';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FCFCFC] flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 justify-center mb-6">
            <h1 className="text-3xl font-bold text-center text-[#858199]">
              Atris AI
            </h1>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#F7F7F7] h-[600px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-6 p-8 text-center">
              <div className="text-6xl">🤖❓</div>
              <h2 className="text-2xl font-semibold text-[#858199]">
                Page Not Found
              </h2>
              <p className="text-[#858199] max-w-md">
                The page you&apos;re looking for doesn&apos;t exist or has been moved.
              </p>
              <Link href="/">
                <Button
                  color="gradient"
                  variant="primary"
                  size="default"
                  className="!bg-[#7E1BCC] hover:!bg-[#6A16AC]"
                >
                  Return Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
