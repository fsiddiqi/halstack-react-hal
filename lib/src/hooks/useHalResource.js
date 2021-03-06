import { useState, useEffect } from "react";
import { HalApiCaller } from "@dxc-technology/halstack-client";

const useHalResource = ({ url, headers, asyncHeadersHandler }) => {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [resource, setResource] = useState(null);
  const [interactions, setInteractions] = useState(null);

  useEffect(() => {
    const fetchResource = async () => {
      setStatus("fetching");
      try {
        const asyncHeaders = asyncHeadersHandler ? await asyncHeadersHandler() : {};
        const response = await HalApiCaller.get({
          url,
          headers: { ...headers, ...asyncHeaders },
        });
        if (response.containsHalResource) {
          setStatus("resolved");
          setResource(response.halResource);
          setInteractions(getInteractions(response.halResource));
        } else {
          setStatus("rejected");
          setResource(null);
          setError("Response doesnt contain a valid HAL resource");
        }
      } catch (err) {
        setStatus("rejected");
        setResource(null);
        setError("Error fetching HAL resource");
      }
    };

    const getInteractions = (halResource) => {
      return halResource
        .getInteractions()
        .map((interaction) => ({
          rel: interaction.rel,
          handler: getInteractionHandler(
            interaction.method,
            halResource.getLink("self"),
            interaction.href
          ),
        }))
        .reduce(
          (obj, interaction) => ({
            ...obj,
            [interaction.rel]: interaction.handler,
          }),
          {}
        );
    };

    const getInteractionHandler = (method, resourceSelf, methodHref) => {
      const apiCallerFunctionName =
        method === "GET"
          ? "get"
          : method === "POST"
          ? "post"
          : method === "DELETE"
          ? "del"
          : method === "PATCH"
          ? "patch"
          : null;
      return async (body) => {
        setStatus("interaction");
        const asyncHeaders = asyncHeadersHandler ? await asyncHeadersHandler() : {};
        return HalApiCaller[apiCallerFunctionName]({
          url: methodHref,
          body,
          headers: { ...headers, ...asyncHeaders },
        })
          .then((response) => {
            if (
              response.containsHalResource &&
              response.halResource?.getLink("self")?.href === resourceSelf?.href
            ) {
              setStatus("resolved");
              setResource(response.halResource);
            } else {
              setStatus("resolved");
            }
            return response;
          })
          .catch((err) => {
            setStatus("resolved");
            throw err;
          });
      };
    };
    if (url) {
      fetchResource();
    }
  }, [url, headers, asyncHeadersHandler]);

  return [resource, status, error, interactions];
};

export default useHalResource;
