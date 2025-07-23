import { logoutAction } from "@/lib/actions";
import { MainNav } from "./mainNav";
import { Button } from "./ui/button";

const Navbar = () => {
  return (
    <div className="border-b">
      <div className="flex h-16  items-center px-4 justify-end">
        <MainNav className="mx-6" />
        <div className="ml-auto flex items-center space-x-4">
          <Button onClick={logoutAction}>Log Out</Button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
