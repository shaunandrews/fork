// The four tabs (Week, Meals, List, Family) are one page: every tab's route file exports this same
// component, so moving between them doesn't remount anything. The app frame stays, the magnet nav
// keeps its letters, and all four tabs stay mounted side by side so a swipe shows the real next tab.
// Screens you drill into (a recipe, an idea, a new recipe) are their own pages.
import { useLocation } from "@spacefast/zero/client";
import { api, AppLoading, FamilyPage, Landing, ListPage, Redirect, useUser, WeekPage } from "./index";
import { AppFrame, AppPage } from "./layout";
import { IdeasPage, IngredientsPage, RecipesPage } from "./meals";

let mealsPath = "/meals";

function MealsPane({ path }: { path: string }) {
  if (path === "/meals/ideas")
    return (
      <AppPage title="Meals" tabTitle="Ideas" width="wide">
        <IdeasPage />
      </AppPage>
    );
  if (path === "/meals/ingredients")
    return (
      <AppPage title="Meals" tabTitle="Ingredients" width="wide">
        <IngredientsPage />
      </AppPage>
    );
  return (
    <AppPage title="Meals" tabTitle="Recipes" width="wide">
      <RecipesPage />
    </AppPage>
  );
}

function SignedInTabs() {
  const me = api.useQuery("me");
  const loc = useLocation();
  if (me === undefined) return <AppLoading />;
  if (!me.family) return <Redirect to="/start" />;
  if (/^\/meals(\/(ideas|ingredients))?$/.test(loc.pathname)) mealsPath = loc.pathname;
  return (
    <AppFrame
      familyName={me.family.name}
      panes={[
        <WeekPage key="week" />,
        <MealsPane key="meals" path={mealsPath} />,
        <AppPage key="list" title="Shopping list">
          <ListPage />
        </AppPage>,
        <AppPage key="family" title="Family">
          <FamilyPage />
        </AppPage>,
      ]}
    />
  );
}

export default function TabsApp() {
  const auth = useUser();
  const loc = useLocation();
  if (auth.isLoading) return <AppLoading />;
  if (!auth.signedIn) return loc.pathname === "/" ? <Landing signedIn={false} /> : <Redirect to="/" />;
  return <SignedInTabs />;
}
