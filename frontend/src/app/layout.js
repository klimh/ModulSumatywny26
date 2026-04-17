import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from '@/providers/providers.jsx';

const jakartaSans = Plus_Jakarta_Sans({
    variable: "--font-sans",
    subsets: ["latin", "latin-ext"],
});

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-mono",
    subsets: ["latin", "latin-ext"],
});

export const metadata = {
    title: "RehabSense",
    description: "Your journey back to strength",
};

export default function RootLayout({ children }) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
        >
            <body className={`h-full flex flex-col items-center justify-center ${jakartaSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
