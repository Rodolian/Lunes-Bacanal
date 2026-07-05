"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { subscribeToUserProfile } from "@/services/userService";
import { logoutUser } from "@/services/authService";
import { UserProfile } from "@/services/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

export default function Header() {
  const { user } = useAuth();
  const [dbUser, setDbUser] = useState<UserProfile | null>(null);

  const getInitials = () => {
    if (dbUser?.nombre) {
      return dbUser.nombre.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "?";
  };

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToUserProfile(user.uid, (profile) => {
      setDbUser(profile);
    });
  }, [user]);

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Lunes Bacanal"
            className="h-8 w-8 rounded-lg shadow-md shadow-zinc-800 object-cover"
          />
          <span className="font-bold tracking-tight text-zinc-50">Lunes Bacanal</span>
        </Link>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none cursor-pointer">
              <Avatar size="default" className="border border-zinc-800">
                <AvatarImage src={dbUser?.photoURL || undefined} alt="Avatar" />
                <AvatarFallback className="bg-zinc-800 text-zinc-300 font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border border-zinc-800 text-zinc-100">
              <DropdownMenuItem
                render={<Link href="/perfil" />}
                className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800 focus:bg-zinc-800 focus:text-zinc-50"
              >
                <User className="h-4 w-4" />
                <span>Mi Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={logoutUser}
                className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800 focus:bg-zinc-800 focus:text-zinc-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
