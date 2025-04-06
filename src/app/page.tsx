import { WalletConnector } from "@/components/WalletConnector";
import { MintCard } from "@/components/MintCard";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-8">My Awesome NFT Mint</h1>
      <WalletConnector />
      <MintCard />

      {/* Optional: Add links or other info */}
      <div className="mt-8 text-center text-gray-500 text-xs">
        <p>Make sure you are connected to the correct network ({process.env.NEXT_PUBLIC_NETWORK || 'DEVNET'}).</p>
        <p>Contract: {process.env.NEXT_PUBLIC_MODULE_ADDRESS || 'Not Set'} | Object: {process.env.NEXT_PUBLIC_CANDY_MACHINE_ADDRESS || 'Not Set'}</p>
      </div>
    </div>
  );
} 