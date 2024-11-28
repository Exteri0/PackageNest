import { useEffect } from "react";
import axios from "axios";
import config from "../config";
import { useState } from "react";


export default function Reset() {
  const [status, setStatus] = useState(0);
  useEffect(() => {
    axios.delete(`${config.apiBaseUrl}/reset`).then((response) => {
      console.log(response.status);
      if(response.status === 200)setStatus(2);
      else setStatus(1);
    }).catch((error) => {
      console.error(error);
      setStatus(1);
    })
    
  }, []);
  const message = ["DB IS NOT RESET", "An error happened, please check console","DB IS RESET LES GO"];
  return (<h1>{message[status]}</h1>);}
