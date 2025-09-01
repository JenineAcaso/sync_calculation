import { insertRow } from "./services/google/googlesheet.js";


const main = async () => {

    const googlesheet_insert = await insertRow({ from: 'Vincent Jay Bano', message: 'I Love you' });
    console.log("Inserted row: ", googlesheet_insert);
};


main()
