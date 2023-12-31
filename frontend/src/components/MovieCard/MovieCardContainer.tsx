import React, { useState, useEffect } from "react";
import MovieCard from "./MovieCard";
import styles from "./MovieCardContainer.module.css"; // We'll create this CSS module next
import axios from "axios";

import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import "../filter/YearDropDownBox";
import YearDropdown from "../filter/YearDropDownBox";
import MovieGenres from "../filter/GenreFilter";
import MovieSelected from "../filter/MovieSelected";
import ClusteringOption from "../ClusteringOption/ClusteringOption";
import Page from "../filter/pagination";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';


import sendData, { extractImdb } from "./SendData";
import { useNavigate } from "react-router-dom";


interface Movie {
  title: string;
  genres: string[];
  posterUrl: string;
  imdbId: string;
  year: string;
  rated: string;
  plot: string;
}

interface MovieTitleProps {
  searchTitle: string;
}

interface queryData {
  title?: string;
  year?: string;
  genres?: string;
}

/*************************/
/* backend Movie props  */
/*************************/
interface MovieProps {
  title: string;
  genres: string;
  posterUrl: string;
  imdbId: string;
  year: string;
  rated: string;
}

/*************************/
/* clustering Option props  */
/*************************/
interface clusteringOptionProps {
  option: string;
  isChecked: boolean;
}

const modifyMovie = async (movie: MovieProps): Promise<Movie> => {
  try {
    const padWithLeadingZeros = (s: string, targetLength: number): string => {
      s = String(s);
      while (s.length < targetLength) {
        s = "0" + s;
      }
      return s;
    };

    const imdb = "tt" + padWithLeadingZeros(movie.imdbId, 7);
    //console.log(imdb);
    /*list of key
      35445619
            f451c5dd
            4daa1e35
            7cb0f304
        */
    const response = await fetch(
      `https://www.omdbapi.com/?i=${imdb}&apikey=35445619`
    );
    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const movieData: any = await response.json();
    const m: Movie = {
      //from backend
      imdbId: movie.imdbId,
      title: movie.title,
      genres: movie.genres.split("|"),
      year: movie.year,
      //from omdb
      posterUrl: movieData.Poster,
      rated: movieData.Rated,
      plot: movieData.Plot,
    };

    return m;
  } catch (error) {
    console.log(error);
    throw error;
  }
};


/*******************************/
/*    Querry                   */
/*******************************/
interface QueryParams {
  imdbList: string[];
  options: Array<"title" | "genres">;
  k: number;
}

const getQueryParams = (data: QueryParams) => {

  const searchParams = new URLSearchParams();

  searchParams.append("imdbList", data.imdbList.join(","));
  searchParams.append("options", data.options.join(","));
  searchParams.append("k", data.k.toString());
  
  const queryString = searchParams.toString();
  return queryString;
}

const MovieCardContainer: React.FC<MovieTitleProps> = ({ searchTitle }) => {
  /*************************
   * Modal
   */
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  /***************************/
  /* Fetch data from backend */
  /***************************/
  const [qdata, setData] = useState<MovieProps[]>([]);
  /****************************/
  /* complete movie list */
  /****************************/
  const [moviesList, setMovies] = useState<Movie[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [option, setOption] = useState<clusteringOptionProps[]>([]);

  // Get the selected movie from the card
  const [selectedMovie, setSelectedMovie] = useState<Movie[]>([]);
  const handleCardClick = (movie: Movie) => {
    // Check if the movie is already in the selectedMovie array
    const isMovieSelected = selectedMovie.some(
      (selected) => selected.imdbId === movie.imdbId
    );
    if (!isMovieSelected) {
      setSelectedMovie([...selectedMovie, movie]); // Update the selectedMovie state
    }
  };
  /***************************/
  /* Remove movie from selected movie */
  /***************************/
  const handleRemoveMovie = (imdbId: string) => {
    // Function to update the state to remove the movie with the given IMDb ID
    setSelectedMovie(currentMovies => currentMovies.filter(movie => movie.imdbId !== imdbId));
  };
  

  /***************************/
  /* Get the selected year */
  /***************************/
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
  };

  /***************************/
  /* Get the selected genres */
  /***************************/
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const handleGenreChange = (genre: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedGenres([...selectedGenres, genre]);
    } else {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    }
  };

  /***************************/
  /* Fetch data from backend */
  /***************************/
  useEffect(() => {
    const query: queryData = {};
    if (searchTitle) {
      query["title"] = searchTitle;
    }
    if (selectedYear) {
      query["year"] = selectedYear;
    }
    if (selectedGenres.length > 0) {
      query["genres"] = selectedGenres.join("|");
    }
    const fetchData = async () => {
      try {
        const res = await axios({
          method: "POST",
          url: "http://localhost:8000/api/movies/",
          data: query,
        });
        setData(res.data);
        setLoading(false);
      } catch (err) {
        console.log(err);
        setError("Failed to fetch data");
        setLoading(false);
      }
    };
    fetchData();
  }, [searchTitle, selectedYear, selectedGenres]);

  /***************************/
  /* Fetch data from omdb */
  /* and complete movie list */
  /***************************/
  useEffect(() => {
    const moviesPro = qdata.map((movie) => modifyMovie(movie));

    Promise.all(moviesPro)
      .then((movies) => {
        setMovies(movies);
      })
      .catch((err) => {
        console.log(err);
        setError("Failed to fetch data");
        setLoading(false);
      });
  }, [qdata]);

  /***************************/
  /* Clustering Options */
  /***************************/
  const [k, setK] = useState<number>(0);
  const [clusterOption, setClusterOption] = useState<Array<"title" | "genres">>([]);
  const handleClusterChange = (option: string[], k: number) => {
    const opts:Array<"title" | "genres"> = option as Array<"title" | "genres">;

    if(opts.length === 0){
      setClusterOption(['genres', 'title']);
    }else{
      setClusterOption(opts); 
    }
    if(k <= 0) {
      setK(10);
    }else{
      setK(k);
    }
  
  }


  /***************************/
  /* Submit movie button */
  /***************************/
  const navigate = useNavigate();

  const handleSubmitSelectedMovies = () => {
    if(k <3){
      handleShow();
      return
    }

    const imdbList = extractImdb(selectedMovie);
    //const data = new URLSearchParams({imdbList: imdbList.join(",")}).toString();
    const data = getQueryParams({imdbList: imdbList, options: clusterOption, k: k });
    console.log(data);
    const url = `/movies?${data}`;

    window.open(url, "_blank");
};


    if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }
  return (
    <>
     <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Error!!!</Modal.Title>
        </Modal.Header>
        <Modal.Body>Please enter K more than 2!</Modal.Body>
        <Modal.Footer>
          
          <Button variant="primary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    <Row>
      <Col md={2}>
        <MovieGenres onGenreChange={handleGenreChange} />
        <YearDropdown onYearChange={handleYearChange} />
      </Col>
      <Col md={8}>
        <Container>
          <Row className="justify-content-center">
            {moviesList.map((movie, index) => (
              <Col
                md={4}
                key={movie.imdbId}
                className="mb-3 d-flex align-items-stretch"
              >
                <Card
                  className={`${styles.cardZoom} mx-auto`} // Added mx-auto to center the card and removed the inline style width
                  style={{ cursor: "pointer" }}
                  onClick={() => handleCardClick(movie)}
                >
                  <Card.Img variant="top" src={movie.posterUrl} />
                  <Card.Body className="text-center">
                    {" "}
                    {/* Added text-center here */}
                    <Card.Title>{movie.title}</Card.Title>
                    <Card.Text>
                      <div>Genre: {movie.genres.join(", ")}</div>
                      <div>IMDB ID: {movie.imdbId}</div>
                      <div>Year: {movie.year}</div>
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
          <Row className="mt-5">
                        <Col md={6} className="mx-auto">
                            <Page />
                        </Col>
                    </Row>
        </Container>
      </Col>

      <Col md={2}>
      <ClusteringOption onChange={handleClusterChange}/>
      <MovieSelected movieList={selectedMovie} onRemove={handleRemoveMovie} onSubmit={handleSubmitSelectedMovies}/>
      </Col>
    </Row>
    </>
  );

};

export default MovieCardContainer;
