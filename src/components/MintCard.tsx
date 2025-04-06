"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network, U64 } from "@aptos-labs/ts-sdk";
import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

// --- Configuration ---
// TODO: Replace with your actual deployed addresses and network
const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULE_ADDRESS || "0xYOUR_DEPLOYER_ADDRESS_HERE";
const CANDY_MACHINE_OBJECT_ADDRESS = process.env.NEXT_PUBLIC_CANDY_MACHINE_ADDRESS || "0xYOUR_CANDY_MACHINE_OBJECT_ADDRESS_HERE";
const NETWORK = process.env.NEXT_PUBLIC_NETWORK === "mainnet" ? Network.MAINNET :
                process.env.NEXT_PUBLIC_NETWORK === "testnet" ? Network.TESTNET :
                Network.DEVNET;
const aptosConfig = new AptosConfig({ network: NETWORK });
const aptos = new Aptos(aptosConfig);
// --- End Configuration ---


// Define the structure mirroring the Move CandyMachine struct
interface CandyMachineState {
    collection_name: string;
    total_supply: string; // u64 can be large, use string
    minted: string;       // u64 can be large, use string
    public_sale_mint_price: string; // u64
    presale_mint_price: string;     // u64
    presale_mint_time: string;      // u64 timestamp seconds
    public_sale_mint_time: string;  // u64 timestamp seconds
    paused: boolean;
    is_openedition: boolean;
    // Add other fields if needed for UI logic
}

// Define structure for Merkle proof API response (adjust as needed)
interface MerkleProofResponse {
    proof: string[]; // Array of hex strings
    limit: string;   // u64 as string
}


export function MintCard() {
    const { account, connected, signAndSubmitTransaction } = useWallet();
    const [candyState, setCandyState] = useState<CandyMachineState | null>(null);
    const [merkleProof, setMerkleProof] = useState<MerkleProofResponse | null>(null);
    const [isLoadingState, setIsLoadingState] = useState(true);
    const [isMinting, setIsMinting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

    const fetchCandyMachineState = useCallback(async () => {
        setIsLoadingState(true);
        setError(null);
        console.log(`Fetching resource from: ${CANDY_MACHINE_OBJECT_ADDRESS}`);
        console.log(`Resource type: ${MODULE_ADDRESS}::candymachinev2::CandyMachine`);
        try {
            const resource = await aptos.getAccountResource<CandyMachineState>({
                accountAddress: CANDY_MACHINE_OBJECT_ADDRESS,
                resourceType: `${MODULE_ADDRESS}::candymachinev2::CandyMachine`,
            });
            setCandyState(resource);
            console.log("Fetched Candy Machine State:", resource);
        } catch (e: any) {
            console.error("Error fetching candy machine state:", e);
             if (e.status === 404) {
                setError(`Candy Machine resource not found at ${CANDY_MACHINE_OBJECT_ADDRESS}. Check address and module deployment.`);
             } else if (e.message){
                setError(`Failed to fetch state: ${e.message}`);
             } else {
                setError("An unknown error occurred while fetching state.");
             }
             setCandyState(null);
        } finally {
            setIsLoadingState(false);
        }
    }, []);

    const fetchMerkleProof = useCallback(async (userAddress: string) => {
        // --- Placeholder for Merkle Proof API ---
        // TODO: Replace with your actual API endpoint call
        console.log(`Fetching Merkle proof for ${userAddress}`);
        setError(null);
        try {
            // Example: Simulating API call
            // const response = await fetch(`/api/get-merkle-proof?address=${userAddress}`);
            // if (!response.ok) {
            //     throw new Error('User not whitelisted or API error');
            // }
            // const data: MerkleProofResponse = await response.json();
            // setMerkleProof(data);
            // console.log("Fetched Merkle proof:", data);

            // Simulate: Return null if not whitelisted, or proof if whitelisted
            // In a real app, your API would determine this
            if (userAddress === "0xSOME_WHITELISTED_ADDRESS_FOR_TESTING") { // Replace for testing
                 const mockProof: MerkleProofResponse = {
                     proof: ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
                     limit: "5"
                 };
                 setMerkleProof(mockProof);
                 console.log("Mock Merkle proof set:", mockProof);
            } else {
                 setMerkleProof(null); // User not whitelisted
                 console.log("User not whitelisted (mock).");
            }

        } catch (e: any) {
            console.error("Error fetching Merkle proof:", e);
            // Don't necessarily set a visible error, just means user isn't whitelisted
            // setError(`Failed to get presale info: ${e.message}`);
            setMerkleProof(null);
        }
        // --- End Placeholder ---
    }, []);


    useEffect(() => {
        fetchCandyMachineState();
        // Update current time every second
        const timer = setInterval(() => {
            setCurrentTime(Math.floor(Date.now() / 1000));
        }, 1000);
        return () => clearInterval(timer); // Cleanup timer
    }, [fetchCandyMachineState]);

    useEffect(() => {
        // Fetch Merkle proof if user is connected and potentially whitelisted
        if (connected && account?.address) {
            fetchMerkleProof(account.address);
        } else {
            setMerkleProof(null); // Clear proof if wallet disconnects
        }
    }, [connected, account, fetchMerkleProof]);

    const submitTransaction = async (payload: InputTransactionData) => {
        if (!connected) return;
        setIsMinting(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const response = await signAndSubmitTransaction(payload);
            console.log("Transaction submitted:", response);
            await aptos.waitForTransaction({ transactionHash: response.hash });
            console.log("Transaction confirmed:", response.hash);
            setSuccessMessage(`Mint successful! Transaction hash: ${response.hash.substring(0, 6)}...`);
            // Re-fetch state to update minted count, etc.
            await fetchCandyMachineState();
            // Re-fetch presale count if needed (or rely on contract logic for limits)
            if (account?.address) await fetchMerkleProof(account.address); // Recheck presale status potentially
        } catch (e: any) {
            console.error("Mint failed:", e);
             if (e.message && e.message.includes("User rejected the request")) {
                setError("Transaction rejected in wallet.");
            } else if (e.errorCode) {
                 // Try to parse Aptos VM error
                 setError(`Mint failed: ${e.errorCode} - ${e.vm_error_code || 'Unknown VM Error'}. Check console for details.`);
            } else if (e.message) {
                setError(`Mint failed: ${e.message}`);
            }
            else {
                setError("An unknown error occurred during minting.");
            }
        } finally {
            setIsMinting(false);
        }
    };

    const handlePublicMint = async () => {
        const payload: InputTransactionData = {
             data:{
                function: `${MODULE_ADDRESS}::candymachinev2::mint_script`,
                typeArguments: [],
                functionArguments: [CANDY_MACHINE_OBJECT_ADDRESS],
            }
        };
        await submitTransaction(payload);
    };

    const handlePresaleMint = async () => {
        if (!merkleProof) {
            setError("Cannot perform presale mint: Missing whitelist proof.");
            return;
        }
        const payload: InputTransactionData = {
            data: {
                function: `${MODULE_ADDRESS}::candymachinev2::mint_from_merkle`,
                typeArguments: [],
                functionArguments: [
                    CANDY_MACHINE_OBJECT_ADDRESS,
                    merkleProof.proof,
                    merkleProof.limit, // Make sure this is string | number
                ],
            }
        };
        await submitTransaction(payload);
    };

    // --- UI Logic ---
    const presaleTime = candyState ? parseInt(candyState.presale_mint_time) : 0;
    const publicSaleTime = candyState ? parseInt(candyState.public_sale_mint_time) : 0;
    const isPresaleActive = candyState && !candyState.paused && currentTime >= presaleTime && currentTime < publicSaleTime;
    const isPublicSaleActive = candyState && !candyState.paused && currentTime >= publicSaleTime;
    const isSoldOut = candyState ? BigInt(candyState.minted) >= BigInt(candyState.total_supply) : false;

    const canPresaleMint = isPresaleActive && !isSoldOut && !!merkleProof;
    const canPublicMint = isPublicSaleActive && !isSoldOut;

    const formatPrice = (price: string | undefined): string => {
        if (!price) return "N/A";
        return (BigInt(price) / BigInt(10**8)).toString() + " APT"; // Convert Octas to APT
    }

    const formatTimestamp = (ts: string | undefined): string => {
        if (!ts) return "N/A";
        const date = new Date(parseInt(ts) * 1000);
        return date.toLocaleString();
    }
    // --- End UI Logic ---


    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-center">
                {candyState?.collection_name || "Mint Your NFT"}
            </h2>

            {isLoadingState && <p className="text-center text-gray-400">Loading collection info...</p>}

            {!isLoadingState && !candyState && error && (
                 <p className="text-center text-red-500 bg-red-900/50 p-3 rounded">{error}</p>
            )}

            {candyState && (
                <div className="space-y-3 text-sm">
                     <div className="flex justify-between"><span>Status:</span> <span className={`font-semibold ${candyState.paused ? 'text-yellow-400' : isSoldOut ? 'text-red-500' : 'text-green-400'}`}>{candyState.paused ? "Paused" : isSoldOut ? "Sold Out" : "Active"}</span></div>
                     <div className="flex justify-between"><span>Minted:</span> <span>{candyState.minted} / {candyState.is_openedition ? "Open Edition" : candyState.total_supply}</span></div>
                    <hr className="border-gray-600"/>
                     <div className="flex justify-between"><span>Presale Price:</span> <span>{formatPrice(candyState.presale_mint_price)}</span></div>
                     <div className="flex justify-between"><span>Presale Start:</span> <span>{formatTimestamp(candyState.presale_mint_time)}</span></div>
                     <div className="flex justify-between"><span>Public Sale Price:</span> <span>{formatPrice(candyState.public_sale_mint_price)}</span></div>
                     <div className="flex justify-between"><span>Public Sale Start:</span> <span>{formatTimestamp(candyState.public_sale_mint_time)}</span></div>
                     {merkleProof && <div className="flex justify-between text-cyan-400"><span>Your Presale Limit:</span> <span>{merkleProof.limit}</span></div>}
                 </div>
            )}

            {error && !isLoadingState && <p className="mt-4 text-center text-red-500 bg-red-900/50 p-3 rounded">{error}</p>}
            {successMessage && <p className="mt-4 text-center text-green-400 bg-green-900/50 p-3 rounded">{successMessage}</p>}

            {connected && candyState && !candyState.paused && !isSoldOut && (
                <div className="mt-6 space-y-3">
                    {isPresaleActive && (
                        <button
                            onClick={handlePresaleMint}
                            disabled={!canPresaleMint || isMinting}
                            className={`w-full px-4 py-2 rounded-md transition-colors font-semibold ${' '}
                                canPresaleMint
                                    ? 'bg-purple-600 hover:bg-purple-700'
                                    : 'bg-gray-600 cursor-not-allowed'
                            }`}
                        >
                            {isMinting ? "Minting..." : merkleProof ? "Mint Presale" : "Not Whitelisted"}
                        </button>
                    )}
                     {isPublicSaleActive && (
                        <button
                            onClick={handlePublicMint}
                            disabled={!canPublicMint || isMinting}
                            className={`w-full px-4 py-2 rounded-md transition-colors font-semibold ${' '}
                                canPublicMint
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-gray-600 cursor-not-allowed'
                            }`}
                         >
                             {isMinting ? "Minting..." : "Mint Public"}
                         </button>
                    )}
                     {!isPresaleActive && !isPublicSaleActive && currentTime < presaleTime && (
                         <p className="text-center text-yellow-400">Mint hasn't started yet.</p>
                     )}
                     {!isPresaleActive && !isPublicSaleActive && currentTime >= publicSaleTime && (
                         <p className="text-center text-gray-400">Public sale phase ended or not configured.</p>
                     )}

                </div>
            )}

             {!connected && <p className="text-center mt-6 text-yellow-500">Please connect your wallet to mint.</p>}
             {connected && candyState?.paused && <p className="text-center mt-6 text-yellow-500">Minting is currently paused.</p>}
             {connected && isSoldOut && <p className="text-center mt-6 text-red-500">This collection is sold out!</p>}
        </div>
    );
} 