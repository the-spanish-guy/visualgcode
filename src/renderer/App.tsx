import Toolbar from "./components/Toolbar";
import styles from "./styles/app.module.css";

export default function App() {
  return ( 
    <div className={styles.root}>
      <Toolbar/>
    </div>
  );
}