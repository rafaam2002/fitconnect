import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import axios from "axios";
import { Article } from "../entities/Article";

export const storeNews = async (
  em: EntityManager<IDatabaseDriver<Connection>>,
  limit: number,
  pages: number[]
) => {
  const articleRepo = em.getRepository(Article);
  const existingArticles = await articleRepo.findAll();
  if (existingArticles.length === 0) {
    try {
      // Realizar todas las peticiones en paralelo
      const responses = await axios.all(
        pages.map((page) => fetchBoxingNews(limit, page))
      );

      // Obtener el repositorio de artículos

      // Procesar cada respuesta y almacenar las noticias en la base de datos
      for (const response of responses) {
        if (response && response.data) {
          for (const newsItem of response.data) {
            // console.log(newsItem)
            const article = articleRepo.create({
              id: newsItem.uuid,
              title: newsItem.title,
              description: newsItem.description,
              publishedAt: newsItem.published_at,
              link: newsItem.url,
              image: newsItem.image_url,
            });
            await em.persistAndFlush(article); // Guardar en la base de datos
          }
        }
      }
      console.log("Noticias guardadas correctamente.");
    } catch (error) {
      console.error("Error al almacenar las noticias:", error);
    }
  }
};
const fetchBoxingNews = async (limit: number, page: number) => {
  try {
    const response = await axios.get("https://api.thenewsapi.com/v1/news/all", {
      params: {
        api_token: "2Z7NKRiCCOlyW1vRW9051aBRqCC9TtoI3d5zSg2e",
        categories: "sports",
        sort: "published_at_desc",
        language: "es",
        search: "boxeo",
        limit,
        page,
      },
    });

    const newsData = response;
    return newsData.data;
  } catch (error) {
    console.error("Error fetching boxing news", error);
  }
};
