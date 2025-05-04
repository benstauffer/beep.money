import LoginForm from '@/components/LoginForm'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">      
      <main className="w-full max-w-md flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          beep.money
        </h1>
        
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 text-center">
          Daily spending updates sent to your inbox
        </p>
        
        <LoginForm />
      </main>
      
      <footer className="mt-16 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} beep.money
      </footer>
    </div>
  );
}
