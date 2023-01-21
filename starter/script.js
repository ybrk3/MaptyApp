'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

/*------------------------------------------------------------------*/
//Workout Classes
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }
}
class Running extends Workout {
  type = 'running';
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.calcPace();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.calcSpeed();
  }
  calcSpeed() {
    this.speed = this.distance / this.duration;
    return this.speed;
  }
}
/*------------------------------------------------------------------*/

class App {
  // prettier-ignore
  months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  #workouts = [];
  #mapZoomLevel = 15;
  #map;
  #mapEvent;
  #selectedActivity = inputType.value;
  constructor() {
    this._getPosition();
    this._getLocalStorage();
    inputType.addEventListener('change', this._toogleElevationField.bind(this));
    document.addEventListener('submit', this._newWorkout.bind(this));

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    //1-Getting current location (Geolocation API)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position. Please reload the page');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    //2-Upload map by your current location via Leaflet API by using hosted version added to html before script
    this.#map = L.map('map').setView(coords, 15);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Adding pointer and displaying the popup with given text
    L.marker(coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxwidth: 50,
          autoClose: false,
          closeOnClick: false,
        })
      )
      .setPopupContent(`Your Location`) //Popup text
      .openPopup();

    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(w => this._renderWorkoutMarker(w));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
    this._clearForm();
  }

  _hideForm() {
    form.classList.add('hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const isValidInput = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const isPositiveInput = (...inputs) => inputs.every(inp => inp > 0);

    const { lat, lng } = this.#mapEvent.latlng;
    //Get data from form
    let elevation, cadence, workout;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    //Data validation
    if (this.#selectedActivity === 'running') {
      cadence = +inputCadence.value;
      if (
        !isValidInput(distance, duration, cadence) ||
        !isPositiveInput(distance, duration, cadence)
      ) {
        return alert('Please enter positive number');
      }
      workout = new Running(distance, duration, [lat, lng], cadence);
    }
    if (this.#selectedActivity === 'cycling') {
      elevation = +inputElevation.value;
      if (
        !isValidInput(distance, duration, elevation) ||
        !isPositiveInput(distance, duration, elevation)
      ) {
        return alert('Please enter positive number');
      }

      workout = new Cycling(distance, duration, [lat, lng], elevation);
    }
    /*  -----------------------------------------------*/
    this.#workouts.push(workout);
    this._renderWorkout(workout);
    this._setLocalStorage();
    this._renderWorkoutMarker(workout);
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords, { opacity: 15 })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxwidth: 250,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`, //CSS
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴'} on ${this._setDate()} `
      )
      .openPopup();
  }

  _renderWorkout(w) {
    this._hideForm();

    const html = `<li class="workout workout--${w.type}" data-id="${w.id}">
    <h2 class="workout__title">${w.type[0].toUpperCase()}${w.type.slice(
      1
    )} on ${this._setDate()}</h2>
    <div class="workout__details">
      <span class="workout__icon">${w.type === 'running' ? '🏃' : '🚴'}</span>
      <span class="workout__value">${w.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${w.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${
        w.type === 'running' ? w.pace.toFixed(1) : w.speed.toFixed(1)
      }</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">${w.type === 'running' ? '🦶🏼' : '⛰'}</span>
      <span class="workout__value">${
        w.type === 'running' ? w.cadence : w.elevationGain
      }</span>
      <span class="workout__unit">${w.type === 'running' ? 'spm' : 'm'}</span>
    </div>
  </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  _toogleElevationField(e) {
    this.#selectedActivity = e.target.options[e.target.selectedIndex].value;
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputDistance.focus();
  }

  _clearForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
  }

  _setDate() {
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  //get workouts and render on the browser
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    //guard clause
    if (!data) return;

    this.#workouts = data;
    //rendering workouts on the browser
    this.#workouts.forEach(w => this._renderWorkout(w));
  }

  _moveToPopup(e) {
    const workoutClick = e.target.closest('.workout');
    if (!workoutClick) return;
    const selectedWorkoutId = workoutClick.dataset.id;
    const selectedWorkout = this.#workouts.find(
      w => +w.id === +selectedWorkoutId
    );

    this.#map.setView(selectedWorkout.coords, 16, {
      animate: true,
      pan: { duration: 1 },
    });
  }
}

const app = new App();

//statement
