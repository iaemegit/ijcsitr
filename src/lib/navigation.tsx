"use client";
import NextLink from "next/link";
import {
  useRouter,
  usePathname,
  useSearchParams as nextSearchParams,
  useParams as nextParams,
} from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
type NavigationState = { path: string; state?: { notice?: string } };
const NavigationContext = createContext<{
  value: NavigationState;
  setValue: (value: NavigationState) => void;
}>({ value: { path: "" }, setValue: () => {} });
export function NavigationProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<NavigationState>({ path: "" });
  return (
    <NavigationContext.Provider value={{ value, setValue }}>
      {children}
    </NavigationContext.Provider>
  );
}
type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  end?: boolean;
};
export function Link({ to, end: _, ...props }: LinkProps) {
  return <NextLink href={to} {...props} />;
}
export function NavLink({ to, end, className, ...props }: LinkProps) {
  const pathname = usePathname() || "/",
    active = end
      ? pathname === to
      : pathname === to || pathname.startsWith(to + "/");
  return (
    <NextLink
      href={to}
      aria-current={active ? "page" : undefined}
      className={[className, active ? "active" : ""].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
export function useNavigate() {
  const router = useRouter(),
    { setValue } = useContext(NavigationContext);
  return useCallback(
    (
      to: string,
      options?: { replace?: boolean; state?: { notice?: string } },
    ) => {
      setValue({ path: to.split("?")[0], state: options?.state });
      if (options?.replace) router.replace(to);
      else router.push(to);
    },
    [router, setValue],
  );
}
export function Navigate({
  to,
  replace = false,
}: {
  to: string;
  replace?: boolean;
}) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace });
  }, [to, replace, navigate]);
  return null;
}
export function useLocation() {
  const pathname = usePathname(),
    { value } = useContext(NavigationContext);
  return { pathname, state: value.path === pathname ? value.state : undefined };
}
export function useSearchParams(): [
  URLSearchParams,
  (value: URLSearchParams | Record<string, string>) => void,
] {
  const params = nextSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  return [
    new URLSearchParams(params?.toString()),
    (value) => {
      const query = new URLSearchParams(value).toString();
      router.push((pathname || "/") + (query ? "?" + query : ""));
    },
  ];
}
export function useParams() {
  return nextParams() || {};
}
