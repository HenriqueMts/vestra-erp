import { login, signup } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense } from "react";
import { AuthFeedback } from "@/components/auth-feedback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white px-4">
      <Suspense fallback={null}>
        <AuthFeedback />
      </Suspense>
      <div className="w-full max-w-[450px] space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Image
            src="/jilem-logo.svg"
            alt="Jilem Modas Logo"
            width={120}
            height={120}
            priority
          />

          <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">
            Portal Administrativo
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100/50 p-1 border border-slate-200">
            <TabsTrigger
              value="login"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all duration-300"
            >
              Entrar
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all duration-300"
            >
              Cadastrar
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="login"
            className="mt-0 focus-visible:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-2 duration-500"
          >
            <Card className="border-slate-200 shadow-xl shadow-slate-200/50 min-h-[440px] flex flex-col justify-between">
              <div>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl text-slate-800">
                    Boas-vindas
                  </CardTitle>
                  <CardDescription className="text-slate-500">
                    Acesse sua conta para gerenciar pedidos e clientes.
                  </CardDescription>
                </CardHeader>
                <form id="login-form">
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-slate-700 font-medium"
                      >
                        E-mail
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="exemplo@jilem.com"
                        className="border-slate-200 focus:border-slate-400 focus:ring-slate-400 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="password"
                        className="text-slate-700 font-medium"
                      >
                        Senha
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="border-slate-200 focus:border-slate-400 focus:ring-slate-400 transition-all"
                      />
                    </div>
                  </CardContent>
                </form>
              </div>
              <CardFooter className="pb-8">
                <Button
                  form="login-form"
                  formAction={login}
                  className="w-full bg-slate-900 hover:bg-black text-white py-6 text-lg transition-all shadow-md"
                >
                  Entrar no Sistema
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent
            value="register"
            className="mt-0 focus-visible:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-2 duration-500"
          >
            <Card className="border-slate-200 shadow-xl shadow-slate-200/50 min-h-[440px] flex flex-col justify-between">
              <div>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl text-slate-800">
                    Criar Conta
                  </CardTitle>
                  <CardDescription className="text-slate-500">
                    Registre sua loja de atacado em poucos segundos.
                  </CardDescription>
                </CardHeader>
                <form id="register-form">
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="text-slate-700 font-medium"
                      >
                        Nome da Loja
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        required
                        placeholder="Jilem Modas - Unidade 01"
                        className="border-slate-200 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="reg-email"
                        className="text-slate-700 font-medium"
                      >
                        E-mail
                      </Label>
                      <Input
                        id="reg-email"
                        name="email"
                        type="email"
                        required
                        className="border-slate-200 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="reg-password"
                        className="text-slate-700 font-medium"
                      >
                        Senha
                      </Label>
                      <Input
                        id="reg-password"
                        name="password"
                        type="password"
                        required
                        className="border-slate-200 transition-all"
                      />
                    </div>
                  </CardContent>
                </form>
              </div>
              <CardFooter className="pb-8">
                <Button
                  form="register-form"
                  formAction={signup}
                  className="w-full bg-slate-900 hover:bg-black text-white py-6 text-lg transition-all shadow-md"
                >
                  Finalizar Cadastro
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
