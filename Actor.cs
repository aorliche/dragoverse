
using System.Windows;
using System.Windows.Forms;
using System.Collections.Generic;

namespace dragoverse;
	
public class Actor : PictureBox {

	string name;
	List<string> actions;
	string curAction;
	public int? moveSpeed;

	public Actor(Point loc, string name, List<string> actions) {
		this.name = name;
		this.actions = new List<string>(actions);
		this.updateSprite(this.actions[0]);
		this.Location = loc;
		this.BackColor = System.Drawing.Color.Transparent;
	}

	public void updateSprite(string action) {
		this.curAction = action;
		this.Image = Image.FromFile(@"images/sprites/" + this.name + "/" + this.name + "_" + action + ".png");
	}

	public void tick() {}
}

public class Pig : Actor {
	public Pig(Point loc) : base(loc, "pig", new List<string>{"up", "down", "left", "right"}) {
		this.moveSpeed = 5;
	}
}

public class Shroom : Actor {
	public Shroom(Point loc, List<string> actions): base(loc, "shroom", actions) {}
}

public class HealthShroom : Shroom {
	public HealthShroom(Point loc) : base(loc, new List<string>{"health"}) {}
}

public enum State {up, down, left, right}

public class Player {
	public Actor puppet;
	List<State> state = new List<State>();
	public State facing = State.up;

	public Player(Actor act) {
		this.puppet = act;
	}

	public void tick() {
		if (state.Count == 0) {
			return;
		}
		State cur = state[state.Count-1];
		int ms = (int)puppet.moveSpeed;
		Point loc = puppet.Location;
		if (cur == State.up) {
			puppet.Location = new Point(loc.X, loc.Y-ms); 	
		}
		if (cur == State.down) {
			puppet.Location = new Point(loc.X, loc.Y+ms); 	
		}
		if (cur == State.left) {
			puppet.Location = new Point(loc.X-ms, loc.Y); 	
		}
		if (cur == State.right) {
			puppet.Location = new Point(loc.X+ms, loc.Y); 	
		}
	}

	public void pushState(State st) {
		if (!state.Contains(st)) {
			state.Add(st);
		}
		updateFacing(st);
		puppet.updateSprite(st.ToString());

	}

	public void popState(State st) {
		while (state.Contains(st)) {
			state.Remove(st);
		}
		if (state.Count > 0) {
			State cur = state[state.Count-1];
			updateFacing(cur);
			puppet.updateSprite(cur.ToString());
		}
	}

	public void updateFacing(State st) {
		if (st == State.up || st == State.down || st == State.left || st == State.right) {
			this.facing = st;
		}
	}
}
