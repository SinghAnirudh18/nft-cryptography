import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Timer, Sparkles } from "lucide-react";
import { NFT } from "../../types";

interface NFTCardProps {
    nft: NFT;
    status?: 'listing' | 'owned' | 'rented';
    onAction?: (action: string, id: string) => void;
}

const NFTCard = ({ nft, status = 'listing', onAction }: NFTCardProps) => {
    // Determine if this is an owned NFT that is currently rented out
    const isRentedOut = status === 'owned' && (nft.status === 'rented' || nft.isEscrowed);

    return (
        <Card className="group relative overflow-hidden border border-white/5 bg-[#161a2b] hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 rounded-[1.5rem]">

            {/* Image Section */}
            <div className="relative aspect-square overflow-hidden rounded-t-[1.5rem] bg-[#0a0b14]">
                <img
                    src={nft.image}
                    alt={nft.name}
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                />

                {/* Overlay Gradient (Darker for contrast) */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#161a2b] via-transparent to-transparent opacity-90" />

                {/* Top Actions */}
                <div className="absolute top-3 right-3 flex gap-2 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <button className="p-2 rounded-full bg-black/60 backdrop-blur-md hover:bg-white/20 transition-colors text-white border border-white/10">
                        <Heart className="w-4 h-4" />
                    </button>
                </div>

                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                    {status === 'rented' && (
                        <Badge className="backdrop-blur-md bg-purple-500/20 text-purple-300 border-purple-500/30">
                            Rented
                        </Badge>
                    )}
                    {status === 'owned' && !isRentedOut && (
                        <Badge className="backdrop-blur-md bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                            Owned
                        </Badge>
                    )}
                    {isRentedOut && (
                        <Badge variant="outline" className="backdrop-blur-md bg-amber-500/20 text-amber-300 border-amber-500/30">
                            Rented Out
                        </Badge>
                    )}
                </div>

                {/* Bottom Info Overlay (Time/Status) */}
                {(nft.timeLeft || status === 'listing' || isRentedOut) && (
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        {(nft.timeLeft || nft.rentalEndDate) && (
                            <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-xs font-bold text-white flex items-center gap-1.5 border border-white/10 shadow-lg">
                                <Timer className="w-3.5 h-3.5 text-primary" />
                                {nft.timeLeft || (nft.rentalEndDate ? new Date(nft.rentalEndDate).toLocaleDateString() : 'N/A')}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-5 space-y-4 relative z-10">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-bold text-primary tracking-widest uppercase">{nft.collection}</p>
                        {nft.likes && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Heart className="w-3 h-3 group-hover:text-red-500 transition-colors" />
                                <span>{nft.likes}</span>
                            </div>
                        )}
                    </div>
                    <h3 className="font-bold text-lg leading-tight text-white group-hover:text-primary transition-colors line-clamp-1 mb-1">
                        {nft.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                            {nft.creator.charAt(0)}
                        </div>
                        <span className="truncate max-w-[150px] font-medium text-gray-300">@{nft.creator}</span>
                    </div>
                </div>

                <div className="h-px bg-white/5" />

                {/* Pricing / Action Area */}
                <div className="flex items-end justify-between gap-3">

                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            {status === 'listing' ? 'Price' : status === 'rented' ? 'Expires' : 'Est. Value'}
                        </span>

                        {status === 'rented' ? (
                            <span className="text-sm font-bold text-white">{nft.timeLeft || (nft.rentalEndDate ? new Date(nft.rentalEndDate).toLocaleDateString() : 'Unknown')}</span>
                        ) : (
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-white">{nft.price}</span>
                                <span className="text-xs font-bold text-primary">{nft.currency || 'ETH'}</span>
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <div className="flex-1 max-w-[120px]">
                        {status === 'listing' && (
                            <Button size="sm" className="w-full bg-white text-black hover:bg-gray-200 font-bold shadow-lg shadow-white/5 h-9 rounded-xl" onClick={() => onAction?.('rent', nft.id)}>
                                Rent
                            </Button>
                        )}
                        {status === 'owned' && !isRentedOut && (
                            <Button variant="outline" size="sm" className="w-full border-white/20 hover:bg-white/10 text-white h-9 rounded-xl font-medium" onClick={() => onAction?.('list', nft.id)}>
                                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> List
                            </Button>
                        )}
                        {isRentedOut && (
                            <Button variant="secondary" size="sm" className="w-full opacity-50 cursor-not-allowed h-9 rounded-xl bg-white/5 text-gray-400" disabled>
                                On Loan
                            </Button>
                        )}
                        {status === 'rented' && (
                            <Button variant="destructive" size="sm" className="w-full h-9 shadow-lg shadow-red-500/20 rounded-xl font-medium" onClick={() => onAction?.('return', nft.id)}>
                                Return
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default NFTCard;
