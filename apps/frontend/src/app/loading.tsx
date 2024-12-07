export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FCFCFC] flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 justify-center mb-6">
            <h1 className="text-3xl font-bold text-center text-[#858199] animate-pulse">
              Atris AI
            </h1>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#F7F7F7] h-[600px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-[#7E1BCC] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#858199]">Loading...</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
