using System.Drawing;
using System.Windows;
using System.Windows.Forms;

namespace dragoverse;

public partial class MainWindow : Form
{
	Player player; 
	System.Windows.Forms.Timer mainLoop;

    public MainWindow()
    {
        InitializeComponent();
	this.BackColor = Color.FromArgb(0x30,0xaa,0x30);
	this.player = new Player(new Pig(new Point(400,300)));
	this.Controls.Add(player.puppet);
	this.Controls.Add(new HealthShroom(new Point(500,200)));
	this.KeyDown += new KeyEventHandler(this.keyDown);
	this.KeyUp += new KeyEventHandler(this.keyUp);
	this.mainLoop = new System.Windows.Forms.Timer(this.components);
	this.mainLoop.Enabled = true;
	this.mainLoop.Interval = 50;
	this.mainLoop.Tick += new System.EventHandler(this.tick);
    }

    public void tick(object sender, EventArgs e) {
	    foreach (Control act in this.Controls) {
		    if (act is Actor) {
			    ((Actor)act).tick();
		    }
	    }
	    this.player.tick();
    }

    public void keyDown(object sender, KeyEventArgs e) {
	switch(e.KeyCode) {
		case Keys.Left: 
			player.pushState(State.left);
			break;
		case Keys.Right: 
			player.pushState(State.right);
			break;
		case Keys.Up: 
			player.pushState(State.up);
			break;
		case Keys.Down: 
			player.pushState(State.down);
			break;
	}

    }

    public void keyUp(object sender, KeyEventArgs e) {
	switch(e.KeyCode) {
		case Keys.Left: 
			player.popState(State.left);
			break;
		case Keys.Right: 
			player.popState(State.right);
			break;
		case Keys.Up: 
			player.popState(State.up);
			break;
		case Keys.Down: 
			player.popState(State.down);
			break;
	}
	    
    }
}
